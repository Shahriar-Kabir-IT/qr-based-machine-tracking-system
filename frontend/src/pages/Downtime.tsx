import { useEffect, useState } from 'react';
import { Table, Tag, Typography, Button, Modal, Descriptions, Tooltip, Select, Space } from 'antd';
import { EyeOutlined, FilterOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const statusColor: Record<string, string> = {
  reported: 'orange', acknowledged: 'blue', repair_done: 'cyan', service_complete: 'green',
};
const statusLabel: Record<string, string> = {
  reported: 'Reported', acknowledged: 'Mechanic Working', repair_done: 'Repair Done', service_complete: 'Service Complete',
};

const factoryOptions = [
  { value: 'AGL', label: 'AGL' },
  { value: 'AJL', label: 'AJL' },
  { value: 'ABM', label: 'ABM' },
];

export default function Downtime() {
  const { user, isSuperAdmin } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [selectedFactory, setSelectedFactory] = useState<string | null>(isAdmin && user?.facility ? user.facility : null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [floorOptions, setFloorOptions] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    const params: any = {};
    if (selectedFactory) params.facility = selectedFactory;
    if (selectedFloor) params.floor = selectedFloor;
    api.get('/downtime', { params }).then((res) => { setRecords(res.data); setLoading(false); });
  };

  useEffect(() => { load(); }, [selectedFactory, selectedFloor]);

  useEffect(() => {
    const fac = selectedFactory || (isAdmin && user?.facility ? user.facility : null);
    if (fac) {
      api.get('/machines', { params: { facility: fac } }).then((res) => {
        const floors = [...new Set(res.data.map((m: any) => m.currentFloor || m.floor).filter(Boolean))].sort();
        setFloorOptions(floors as string[]);
      });
    } else {
      setFloorOptions([]);
    }
  }, [selectedFactory]);

  const columns = [
    {
      title: 'Machine No', dataIndex: ['machine', 'machineId'], key: 'asset', width: 130,
      render: (v: string) => v ? <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{v}</span> : '—',
    },
    { title: 'Type', dataIndex: 'machineType', key: 'type', width: 70, render: (v: string) => <Tag color="blue" style={{ margin: 0 }}>{v}</Tag> },
    { title: 'Floor', dataIndex: 'floor', key: 'floor', width: 60 },
    { title: 'Line', dataIndex: 'line', key: 'line', width: 60, render: (v: string) => v || '—' },
    { title: 'Issue', dataIndex: 'issueDescription', key: 'issue', ellipsis: true },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 140,
      render: (s: string) => <Tag color={statusColor[s]}>{statusLabel[s]}</Tag>,
      filters: Object.entries(statusLabel).map(([value, text]) => ({ text, value })),
      onFilter: (value: any, record: any) => record.status === value,
    },
    {
      title: 'Reported', dataIndex: 'reportedAt', key: 'reported', width: 110,
      render: (v: string) => dayjs(v).format('DD MMM HH:mm'),
      sorter: (a: any, b: any) => new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: '', key: 'action', width: 50, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Tooltip title="View Details">
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setDetail(record)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <div className="dt-header">
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Downtime Monitoring
            {selectedFactory && <Tag color="blue" style={{ marginLeft: 8, verticalAlign: 'middle' }}>{selectedFactory}</Tag>}
            {selectedFloor && <Tag color="geekblue" style={{ marginLeft: 4, verticalAlign: 'middle' }}>{selectedFloor}</Tag>}
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {isAdmin ? `Showing ${user?.facility} factory records` : 'Select factory and floor to filter'}
          </Typography.Text>
        </div>
        <Space wrap size={8}>
          <FilterOutlined style={{ color: '#8c8c8c' }} />
          {isSuperAdmin && (
            <Select
              placeholder="Factory"
              value={selectedFactory}
              onChange={(v) => { setSelectedFactory(v); setSelectedFloor(null); }}
              allowClear
              style={{ width: 100 }}
              size="small"
              options={factoryOptions}
            />
          )}
          {isAdmin && user?.facility && (
            <Tag color="blue" style={{ lineHeight: '24px' }}>{user.facility}</Tag>
          )}
          <Select
            placeholder="Floor"
            value={selectedFloor}
            onChange={setSelectedFloor}
            allowClear
            style={{ width: 100 }}
            size="small"
            options={floorOptions.map((f) => ({ value: f, label: f }))}
            disabled={!selectedFactory && !isAdmin}
          />
        </Space>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <Table dataSource={records} columns={columns} rowKey="id" loading={loading} size="small" scroll={{ x: 600 }}
          pagination={{ pageSize: 20, showSizeChanger: true, size: 'small' }} />
      </div>

      <Modal
        title="Downtime Record Details"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>Close</Button>}
        width={560}
      >
        {detail && (
          <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
            <Descriptions.Item label="Asset ID">
              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{detail.machine?.machineId || '—'}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Machine Type">
              <Tag color="blue">{detail.machineType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Line">{detail.line || '—'}</Descriptions.Item>
            <Descriptions.Item label="Floor">{detail.floor || '—'}</Descriptions.Item>
            <Descriptions.Item label="Status" span={2}>
              <Tag color={statusColor[detail.status]}>{statusLabel[detail.status]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Issue" span={2}>{detail.issueDescription}</Descriptions.Item>
            <Descriptions.Item label="Reported By">{detail.reporterName}</Descriptions.Item>
            <Descriptions.Item label="Reported At">{dayjs(detail.reportedAt).format('DD MMM YYYY HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="Mechanic">{detail.mechanicName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Acknowledged At">
              {detail.acknowledgedAt ? dayjs(detail.acknowledgedAt).format('DD MMM YYYY HH:mm') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Repair Note" span={2}>{detail.repairNote || '—'}</Descriptions.Item>
            <Descriptions.Item label="Spare Parts" span={2}>{detail.sparePartsUsed || '—'}</Descriptions.Item>
            <Descriptions.Item label="Finished At">
              {detail.finishedAt ? dayjs(detail.finishedAt).format('DD MMM YYYY HH:mm') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Repair Time">
              {detail.repairDurationMinutes != null ? `${detail.repairDurationMinutes} min` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Verification Note" span={2}>{detail.verificationNote || '—'}</Descriptions.Item>
            <Descriptions.Item label="Verified At">
              {detail.verifiedAt ? dayjs(detail.verifiedAt).format('DD MMM YYYY HH:mm') : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Total Downtime">
              {detail.totalDowntimeMinutes != null ? `${detail.totalDowntimeMinutes} min` : '—'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <style>{`
        .dt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }
        @media (max-width: 576px) {
          .dt-header { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
