import { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space, Typography, message, AutoComplete, Tabs, Card, Row, Col, Statistic } from 'antd';
import { PlusOutlined, ToolOutlined, DatabaseOutlined, BarChartOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const statusLabels: Record<string, string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
};
const statusColor: Record<string, string> = {
  pending: 'orange', approved: 'green', rejected: 'red',
};
const CHART_COLORS = ['#1890ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911'];

function RequestsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [machines, setMachines] = useState<any[]>([]);
  const [catalogOptions, setCatalogOptions] = useState<any[]>([]);
  const [form] = Form.useForm();
  const { isSuperAdmin } = useAuth();

  const load = useCallback(() => {
    setLoading(true);
    api.get('/spare-parts').then((res) => { setRequests(res.data); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = async () => {
    const res = await api.get('/machines', { params: { status: 'active' } });
    setMachines(res.data);
    setModalOpen(true);
  };

  const searchCatalog = async (text: string) => {
    if (text.length < 2) { setCatalogOptions([]); return; }
    const selectedMachine = machines.find((m: any) => m.id === form.getFieldValue('machineId'));
    const params: any = { q: text };
    if (selectedMachine) params.machineType = selectedMachine.machineType;
    const res = await api.get('/spare-parts/catalog/search', { params });
    setCatalogOptions(res.data.map((p: any) => ({
      value: `${p.partNo} - ${p.description}`,
      label: <span><strong>{p.partNo}</strong> — {p.description} <Tag style={{ marginLeft: 4 }}>{p.machineType}</Tag></span>,
    })));
  };

  const handleSubmit = async (values: any) => {
    const machine = machines.find((m: any) => m.id === values.machineId);
    await api.post('/spare-parts', {
      ...values,
      machineType: machine?.machineType,
      mfgSerialNo: machine?.mfgSerialNo,
    });
    message.success('Spare part request submitted');
    setModalOpen(false);
    form.resetFields();
    setCatalogOptions([]);
    load();
  };

  const handleAction = async (id: number, action: string) => {
    await api.put(`/spare-parts/${id}/${action}`);
    message.success('Status updated');
    load();
  };

  const columns = [
    { title: 'Machine No', dataIndex: ['machine', 'machineId'], key: 'asset', render: (v: string) => v || 'N/A' },
    { title: 'Type', dataIndex: 'machineType', key: 'type' },
    { title: 'Part', dataIndex: 'part', key: 'part' },
    { title: 'Qty', dataIndex: 'qty', key: 'qty' },
    { title: 'Requested By', dataIndex: 'requestedBy', key: 'by' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColor[s]}>{statusLabels[s]}</Tag> },
    { title: 'Requested', dataIndex: 'requestedAt', key: 'time', render: (v: string) => dayjs(v).format('DD MMM HH:mm') },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          {r.status === 'pending' && isSuperAdmin && (
            <Button size="small" type="primary" onClick={() => handleAction(r.id, 'approve')}>Approve</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Request Part</Button>
      </div>
      <Table dataSource={requests} columns={columns} rowKey="id" loading={loading} size="small" />
      <Modal title="Request Spare Part" open={modalOpen} onCancel={() => { setModalOpen(false); setCatalogOptions([]); }} onOk={() => form.submit()} okText="Submit">
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="machineId" label="Machine" rules={[{ required: true }]}>
            <Select showSearch placeholder="Select machine" optionFilterProp="label"
              options={machines.map((m: any) => ({ value: m.id, label: `${m.machineId} - ${m.machineType}` }))} />
          </Form.Item>
          <Form.Item name="part" label="Part Name" rules={[{ required: true }]}>
            <AutoComplete options={catalogOptions} onSearch={searchCatalog} placeholder="Search part from catalog or type manually" />
          </Form.Item>
          <Form.Item name="qty" label="Quantity" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="requestedBy" label="Requested By" rules={[{ required: true }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function CatalogTab() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [machineTypes, setMachineTypes] = useState<string[]>([]);
  const [filters, setFilters] = useState({ machineType: '', search: '', page: 1 });

  useEffect(() => {
    api.get('/spare-parts/catalog/machine-types').then(res => setMachineTypes(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: any = { page: filters.page, limit: 50 };
    if (filters.machineType) params.machineType = filters.machineType;
    if (filters.search) params.search = filters.search;
    api.get('/spare-parts/catalog/all', { params }).then(res => {
      setData(res.data.data);
      setTotal(res.data.total);
      setLoading(false);
    });
  }, [filters]);

  const columns = [
    { title: 'Part No', dataIndex: 'partNo', key: 'partNo', width: 150, render: (v: string) => <strong>{v}</strong> },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Machine Type', dataIndex: 'machineType', key: 'machineType', width: 200, render: (v: string) => <Tag color="blue">{v}</Tag> },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }} wrap>
        <Select
          allowClear placeholder="Filter by Machine Type" style={{ width: 220 }}
          onChange={(v) => setFilters(f => ({ ...f, machineType: v || '', page: 1 }))}
          options={machineTypes.map(t => ({ value: t, label: t }))}
        />
        <Input.Search
          placeholder="Search part no or description" style={{ width: 300 }}
          onSearch={(v) => setFilters(f => ({ ...f, search: v, page: 1 }))}
          allowClear
        />
        <Tag color="geekblue" style={{ fontSize: 13, padding: '4px 12px' }}>{total} parts</Tag>
      </Space>
      <Table
        dataSource={data} columns={columns} rowKey="id" loading={loading} size="small"
        pagination={{
          current: filters.page, pageSize: 50, total,
          onChange: (p) => setFilters(f => ({ ...f, page: p })),
          showTotal: (t) => `Total ${t} parts`,
        }}
      />
    </>
  );
}

function AnalyticsTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/spare-parts/analytics').then(res => { setData(res.data); setLoading(false); });
  }, []);

  if (loading || !data) return <div style={{ textAlign: 'center', padding: 40 }}>Loading analytics...</div>;

  const statusData = data.statusCounts.map((s: any) => ({
    name: statusLabels[s.status] || s.status, count: Number(s.count), totalQty: Number(s.totalQty),
  }));
  const totalRequests = statusData.reduce((sum: number, s: any) => sum + s.count, 0);
  const totalQty = statusData.reduce((sum: number, s: any) => sum + s.totalQty, 0);
  const pendingCount = statusData.find((s: any) => s.name === 'Pending')?.count || 0;

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Total Requests" value={totalRequests} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Total Parts Qty" value={totalQty} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Pending Requests" value={pendingCount} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Catalog Parts" value={data.totalCatalog} valueStyle={{ color: '#1890ff' }} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card size="small" title="Requests by Status">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, count }: any) => `${name}: ${count}`}>
                  {statusData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title="Monthly Request Trend">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.monthlyTrend.map((m: any) => ({ ...m, count: Number(m.count), totalQty: Number(m.totalQty) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#1890ff" name="Requests" />
                <Line type="monotone" dataKey="totalQty" stroke="#52c41a" name="Qty" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card size="small" title="Most Requested Parts (Top 20)">
            <ResponsiveContainer width="100%" height={Math.max(250, data.topParts.length * 28)}>
              <BarChart data={data.topParts.map((p: any) => ({ ...p, requestCount: Number(p.requestCount), totalQty: Number(p.totalQty) }))} layout="vertical" margin={{ left: 120 }}>
                <XAxis type="number" />
                <YAxis dataKey="part" type="category" tick={{ fontSize: 11 }} width={120} />
                <RechartsTooltip />
                <Bar dataKey="requestCount" fill="#1890ff" name="Requests" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title="Parts by Machine Type">
            <ResponsiveContainer width="100%" height={Math.max(250, data.topMachines.length * 28)}>
              <BarChart data={data.topMachines.map((m: any) => ({ ...m, requestCount: Number(m.requestCount), totalQty: Number(m.totalQty) }))} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" />
                <YAxis dataKey="machineType" type="category" tick={{ fontSize: 11 }} width={80} />
                <RechartsTooltip />
                <Bar dataKey="totalQty" fill="#52c41a" name="Total Qty" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card size="small" title="Requests by Mechanic">
            <Table
              dataSource={data.byMechanic.map((m: any, i: number) => ({ key: i, ...m, requestCount: Number(m.requestCount), totalQty: Number(m.totalQty) }))}
              columns={[
                { title: 'Mechanic', dataIndex: 'mechanic', key: 'mechanic' },
                { title: 'Requests', dataIndex: 'requestCount', key: 'requestCount', sorter: (a: any, b: any) => a.requestCount - b.requestCount },
                { title: 'Total Qty', dataIndex: 'totalQty', key: 'totalQty', sorter: (a: any, b: any) => a.totalQty - b.totalQty },
              ]}
              pagination={false} size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" title="Catalog Parts by Machine Type">
            <ResponsiveContainer width="100%" height={Math.max(250, data.catalogStats.length * 32)}>
              <BarChart data={data.catalogStats.map((c: any) => ({ ...c, partsCount: Number(c.partsCount) }))} layout="vertical" margin={{ left: 130 }}>
                <XAxis type="number" />
                <YAxis dataKey="machineType" type="category" tick={{ fontSize: 11 }} width={130} />
                <RechartsTooltip />
                <Bar dataKey="partsCount" fill="#722ed1" name="Parts in Catalog">
                  {data.catalogStats.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default function SpareParts() {
  return (
    <div style={{ padding: '16px 20px' }}>
      <Typography.Title level={4} style={{ margin: '0 0 16px' }}>Spare Parts</Typography.Title>
      <Tabs
        defaultActiveKey="requests"
        items={[
          { key: 'requests', label: <span><ToolOutlined /> Requests</span>, children: <RequestsTab /> },
          { key: 'catalog', label: <span><DatabaseOutlined /> Parts Catalog</span>, children: <CatalogTab /> },
          { key: 'analytics', label: <span><BarChartOutlined /> Analytics</span>, children: <AnalyticsTab /> },
        ]}
      />
    </div>
  );
}
