import { useEffect, useState } from 'react';
import { Card, Row, Col, Table, Typography, Statistic, Spin, Tag, Button, Alert, message } from 'antd';
import {
  SettingOutlined,
  WarningOutlined,
  SwapOutlined,
  ToolOutlined,
  BuildOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import api from '../api/client';
import dayjs from 'dayjs';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get('/dashboard').then((res) => {
      setData(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleApproveReturn = async (id: number) => {
    await api.put(`/transfers/${id}/approve-return`);
    message.success('Return approved — machine restored to original factory');
    load();
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const { stats, machinesByFloor: rawFloorData, topMachineTypes, recentBreakdowns, overdueLoans, returnRequests } = data;

  const facilities = [...new Set((rawFloorData as any[]).map((d: any) => d.facility))].sort();
  const floorChartData = (() => {
    const floors = [...new Set((rawFloorData as any[]).map((d: any) => d.floor))];
    const floorOrder = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH'];
    floors.sort((a, b) => {
      const ai = floorOrder.indexOf(a);
      const bi = floorOrder.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
    return floors.map(floor => {
      const row: any = { floor };
      for (const f of facilities) {
        const match = (rawFloorData as any[]).find((d: any) => d.facility === f && d.floor === floor);
        row[f] = match ? Number(match.count) : 0;
      }
      return row;
    });
  })();

  const statCards = [
    { title: 'Total Machines', value: stats.totalMachines, icon: <SettingOutlined />, color: '#1890ff' },
    { title: 'Under Maintenance', value: stats.underMaintenance, icon: <WarningOutlined />, color: '#ff4d4f' },
    { title: 'In Transit', value: stats.inTransit, icon: <SwapOutlined />, color: '#faad14' },
    { title: 'On Loan', value: stats.loanedCount, icon: <ClockCircleOutlined />, color: '#ff7a45' },
    { title: 'Overdue Loans', value: stats.overdueCount, icon: <ExclamationCircleOutlined />, color: stats.overdueCount > 0 ? '#ff4d4f' : '#8c8c8c' },
    { title: 'Pending Maintenance', value: stats.pendingMaintenance, icon: <ToolOutlined />, color: '#722ed1' },
    { title: 'Spare Parts Open', value: stats.sparePartsOpen, icon: <BuildOutlined />, color: '#13c2c2' },
  ];

  const breakdownColumns = [
    { title: 'Machine No', dataIndex: ['machine', 'machineId'], key: 'asset', render: (v: string) => v || 'N/A' },
    { title: 'Type', dataIndex: 'machineType', key: 'type' },
    { title: 'Line', dataIndex: 'line', key: 'line' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => (
      <Typography.Text type={s === 'reported' ? 'danger' : s === 'acknowledged' ? 'warning' : 'success'} style={{ textTransform: 'capitalize' }}>
        {s.replace(/_/g, ' ')}
      </Typography.Text>
    )},
    { title: 'Reported', dataIndex: 'reportedAt', key: 'time', render: (v: string) => dayjs(v).format('DD MMM YYYY HH:mm') },
  ];

  const overdueColumns = [
    { title: 'Machine No', dataIndex: ['machine', 'machineId'], key: 'asset', render: (v: string) => v ? <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{v}</span> : '—' },
    { title: 'Machine', dataIndex: ['machine', 'machineId'], key: 'machineId', ellipsis: true, render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
    { title: 'From', key: 'from', width: 70, render: (_: any, r: any) => <span style={{ fontSize: 12 }}>{r.fromFacility}</span> },
    { title: 'At', key: 'at', width: 70, render: (_: any, r: any) => <span style={{ fontSize: 12 }}>{r.toFacility}</span> },
    {
      title: 'Due Date', dataIndex: 'expectedReturnDate', key: 'dueDate', width: 110,
      render: (v: string) => {
        const overdueDays = dayjs().diff(dayjs(v), 'day');
        return <span style={{ fontSize: 12, color: '#ff4d4f', fontWeight: 600 }}>{dayjs(v).format('DD MMM YY')} <span style={{ fontSize: 10 }}>({overdueDays}d late)</span></span>;
      },
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 110,
      render: (s: string) => s === 'return_requested' ? <Tag color="volcano" style={{ margin: 0, fontSize: 11 }}>Return Pending</Tag> : <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>Overdue</Tag>,
    },
  ];

  const returnColumns = [
    { title: 'Machine No', dataIndex: ['machine', 'machineId'], key: 'asset', render: (v: string) => v ? <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{v}</span> : '—' },
    { title: 'Machine', dataIndex: ['machine', 'machineId'], key: 'machineId', ellipsis: true, render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
    { title: 'Return To', key: 'returnTo', width: 80, render: (_: any, r: any) => <span style={{ fontSize: 12, fontWeight: 600 }}>{r.fromFacility}</span> },
    { title: 'Currently At', key: 'at', width: 80, render: (_: any, r: any) => <span style={{ fontSize: 12 }}>{r.toFacility}/{r.toFloor}</span> },
    {
      title: 'Requested', dataIndex: 'returnRequestedAt', key: 'requestedAt', width: 100,
      render: (v: string) => <span style={{ fontSize: 11, color: '#8c8c8c' }}>{dayjs(v).format('DD MMM YY')}</span>,
    },
    {
      title: '', key: 'action', width: 90,
      render: (_: any, r: any) => (
        <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => handleApproveReturn(r.id)} style={{ fontSize: 11 }}>
          Approve
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <Typography.Title level={4}>Dashboard</Typography.Title>

      {stats.overdueCount > 0 && (
        <Alert
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message={<strong>{stats.overdueCount} loaned machine(s) overdue for return</strong>}
          description="Machines below have passed their expected return date. Please follow up with the concerned factories."
          style={{ marginBottom: 16 }}
        />
      )}

      {returnRequests?.length > 0 && (
        <Alert
          type="info"
          showIcon
          icon={<SwapOutlined />}
          message={<strong>{returnRequests.length} return request(s) awaiting approval</strong>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        {statCards.map((s) => (
          <Col xs={12} sm={8} md={6} lg={4} xl={3} key={s.title}>
            <Card size="small" styles={{ body: { padding: '8px 12px' } }}>
              <Statistic title={<span style={{ fontSize: 11 }}>{s.title}</span>} value={s.value} prefix={s.icon} valueStyle={{ color: s.color, fontSize: 20 }} />
            </Card>
          </Col>
        ))}
      </Row>

      {returnRequests?.length > 0 && (
        <Card
          title={<span style={{ fontSize: 13 }}><SwapOutlined style={{ color: '#1890ff', marginRight: 6 }} />Return Requests ({returnRequests.length})</span>}
          size="small"
          style={{ marginTop: 16, border: '1px solid #91caff', borderRadius: 6 }}
          styles={{ body: { padding: 0 } }}
        >
          <Table dataSource={returnRequests} columns={returnColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 500 }} />
        </Card>
      )}

      {overdueLoans?.length > 0 && (
        <Card
          title={<span style={{ fontSize: 13 }}><ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 6 }} />Overdue Loans ({overdueLoans.length})</span>}
          size="small"
          style={{ marginTop: 16, border: '1px solid #ffccc7', borderRadius: 6 }}
          styles={{ body: { padding: 0 } }}
        >
          <Table dataSource={overdueLoans} columns={overdueColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 500 }} />
        </Card>
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Machines by Floor" size="small">
            <ResponsiveContainer width="100%" height={Math.max(250, floorChartData.length * 30)}>
              <BarChart data={floorChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="floor" width={100} style={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Legend />
                {facilities.map((f, i) => (
                  <Bar key={f} dataKey={f} stackId="a" fill={['#1890ff', '#52c41a', '#faad14', '#ff4d4f'][i % 4]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Top Machine Types" size="small">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topMachineTypes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="machineType" width={100} />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#722ed1" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="Recent Breakdown Activity" size="small" style={{ marginTop: 16 }}>
        <Table
          dataSource={recentBreakdowns}
          columns={breakdownColumns}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
