import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Space, Typography, message, Card, Row, Col, Statistic, Tooltip, Badge } from 'antd';
import { PlusOutlined, FilterOutlined, EyeOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const activityOptions = [
  'Cleaning', 'Oiling', 'Belt Check', 'Needle Change', 'Tension Adjustment',
  'Bobbin Case Cleaning', 'Feed Dog Check', 'Motor Check', 'General Inspection',
];

const factoryOptions = [
  { value: 'AGL', label: 'AGL' },
  { value: 'AJL', label: 'AJL' },
  { value: 'ABM', label: 'ABM' },
];

export default function Maintenance() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [machines, setMachines] = useState<any[]>([]);
  const [form] = Form.useForm();
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const isAdminOnly = user?.role === 'admin';

  const [selectedFactory, setSelectedFactory] = useState<string | null>(isAdminOnly && user?.facility ? user.facility : null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [floorOptions, setFloorOptions] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    const params: any = {};
    if (selectedFactory) params.facility = selectedFactory;
    if (selectedFloor) params.floor = selectedFloor;
    api.get('/maintenance', { params }).then((res) => { setLogs(res.data); setLoading(false); });
  };

  useEffect(() => { load(); }, [selectedFactory, selectedFloor]);

  useEffect(() => {
    const fac = selectedFactory || (isAdminOnly && user?.facility ? user.facility : null);
    if (fac) {
      api.get('/machines', { params: { facility: fac } }).then((res) => {
        const floors = [...new Set(res.data.map((m: any) => m.currentFloor || m.floor).filter(Boolean))].sort();
        setFloorOptions(floors as string[]);
      });
    } else {
      setFloorOptions([]);
    }
  }, [selectedFactory]);

  const openCreate = async () => {
    const params: any = { status: 'active' };
    if (selectedFactory) params.facility = selectedFactory;
    if (selectedFloor) params.floor = selectedFloor;
    const res = await api.get('/machines', { params });
    setMachines(res.data);
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    const machine = machines.find((m: any) => m.id === values.machineId);
    await api.post('/maintenance', { ...values, machineType: machine?.machineType });
    message.success('Maintenance log created');
    setModalOpen(false);
    form.resetFields();
    load();
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'complete' ? 'incomplete' : 'complete';
    await api.put(`/maintenance/${id}/status`, { status: newStatus });
    message.success('Status updated');
    load();
  };

  const currentMaintenance = logs.filter((r) => r.status === 'incomplete');
  const history = logs.filter((r) => r.status === 'complete');

  const columns = [
    {
      title: 'Machine No', dataIndex: ['machine', 'machineId'], key: 'asset', width: 130,
      render: (v: string) => v ? <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{v}</span> : '—',
    },
    { title: 'Type', dataIndex: 'machineType', key: 'type', width: 70, render: (v: string) => <Tag color="blue" style={{ margin: 0 }}>{v}</Tag> },
    {
      title: 'Floor', key: 'floor', width: 60,
      render: (_: any, r: any) => r.machine?.currentFloor || r.machine?.floor || '—',
    },
    {
      title: 'Line', key: 'line', width: 60,
      render: (_: any, r: any) => r.machine?.line || '—',
    },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 100, render: (v: string) => <Tag>{v?.toUpperCase()}</Tag> },
    { title: 'Activities', dataIndex: 'activities', key: 'activities', ellipsis: true, render: (v: string[]) => v?.join(', ') || '—' },
    { title: 'Performed By', dataIndex: 'performedBy', key: 'by', width: 120 },
    { title: 'Date', dataIndex: 'performedAt', key: 'date', width: 110, render: (v: string) => dayjs(v).format('DD MMM HH:mm') },
    {
      title: '', key: 'actions', width: 70, fixed: 'right' as const,
      render: (_: any, r: any) => (
        <Space size={2}>
          <Tooltip title="Details">
            <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setDetailModal(r)} />
          </Tooltip>
          {isAdmin && (
            <Button size="small" onClick={() => toggleStatus(r.id, r.status)}>
              {r.status === 'complete' ? 'Undo' : 'Done'}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <div className="mt-header">
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Maintenance
            {selectedFactory && <Tag color="blue" style={{ marginLeft: 8, verticalAlign: 'middle' }}>{selectedFactory}</Tag>}
            {selectedFloor && <Tag color="geekblue" style={{ marginLeft: 4, verticalAlign: 'middle' }}>{selectedFloor}</Tag>}
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {isAdminOnly ? `${user?.facility} factory maintenance` : selectedFactory && selectedFloor ? `${selectedFactory} / ${selectedFloor} Floor` : 'Select factory and floor to filter'}
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
          {isAdminOnly && user?.facility && (
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
            disabled={!selectedFactory && !isAdminOnly}
          />
          <Button type="primary" icon={<PlusOutlined />} size="small" onClick={openCreate}>Log Maintenance</Button>
        </Space>
      </div>

      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #fa8c16' }}>
            <Statistic title={<span style={{ fontSize: 11 }}>In Progress</span>} value={currentMaintenance.length} valueStyle={{ color: '#fa8c16', fontSize: 20 }} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #52c41a' }}>
            <Statistic title={<span style={{ fontSize: 11 }}>Completed</span>} value={history.length} valueStyle={{ color: '#52c41a', fontSize: 20 }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #1677ff' }}>
            <Statistic title={<span style={{ fontSize: 11 }}>Total</span>} value={logs.length} valueStyle={{ color: '#1677ff', fontSize: 20 }} />
          </Card>
        </Col>
      </Row>

      {currentMaintenance.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Typography.Title level={5} style={{ margin: '0 0 8px' }}>
            <Badge count={currentMaintenance.length} offset={[10, 0]}>
              <span style={{ paddingRight: 8 }}>Current Maintenance</span>
            </Badge>
          </Typography.Title>
          {currentMaintenance.map((r) => (
            <Card key={r.id} size="small" style={{ marginBottom: 8, borderLeft: '4px solid #fa8c16' }}>
              <div className="mt-card-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Typography.Text strong>
                    {r.machine?.machineId || r.machineType} — {r.machine?.currentFloor || r.machine?.floor || '?'} Floor
                    {r.machine?.line ? `, Line ${r.machine.line}` : ''}
                  </Typography.Text>
                  <div style={{ margin: '4px 0', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <Tag>{r.category?.toUpperCase()}</Tag>
                    {r.activities?.map((a: string) => <Tag key={a} color="blue" style={{ fontSize: 11 }}>{a}</Tag>)}
                  </div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    By {r.performedBy} — {dayjs(r.performedAt).format('DD MMM YYYY HH:mm')}
                  </Typography.Text>
                </div>
                <Space size={4}>
                  <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setDetailModal(r)} />
                  {isAdmin && (
                    <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => toggleStatus(r.id, r.status)}>
                      Done
                    </Button>
                  )}
                </Space>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Typography.Title level={5} style={{ margin: '0 0 8px' }}>
        Maintenance History
      </Typography.Title>
      <div style={{ overflowX: 'auto' }}>
        <Table
          dataSource={history}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ x: 800 }}
          pagination={{ pageSize: 20, showSizeChanger: true, size: 'small' }}
        />
      </div>

      <Modal title="Log Maintenance" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText="Submit">
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="machineId" label="Machine" rules={[{ required: true }]}>
            <Select showSearch placeholder="Select machine" optionFilterProp="label"
              options={machines.map((m: any) => ({
                value: m.id,
                label: `${m.machineId} — ${m.machineType} — ${m.currentFloor || m.floor}${m.line ? ' / ' + m.line : ''}`,
              }))} />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select options={[{ value: 'preventive', label: 'Preventive' }, { value: 'periodical', label: 'Periodical' }, { value: 'daily', label: 'Daily' }]} />
          </Form.Item>
          <Form.Item name="activities" label="Activities" rules={[{ required: true }]}>
            <Select mode="multiple" options={activityOptions.map((a) => ({ value: a, label: a }))} placeholder="Select activities" />
          </Form.Item>
          <Form.Item name="performedBy" label="Performed By" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={[{ value: 'complete', label: 'Complete' }, { value: 'incomplete', label: 'Incomplete' }]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Maintenance Details" open={!!detailModal} onCancel={() => setDetailModal(null)} footer={<Button onClick={() => setDetailModal(null)}>Close</Button>} width={500}>
        {detailModal && (
          <div style={{ fontSize: 13 }}>
            <Row gutter={[12, 8]}>
              <Col span={12}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Asset ID</Typography.Text><br />
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{detailModal.machine?.machineId || '—'}</span>
              </Col>
              <Col span={12}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Type</Typography.Text><br />
                <Tag color="blue">{detailModal.machineType}</Tag>
              </Col>
              <Col span={8}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Factory</Typography.Text><br />
                <strong>{detailModal.machine?.currentFacility || detailModal.machine?.facility || '—'}</strong>
              </Col>
              <Col span={8}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Floor</Typography.Text><br />
                {detailModal.machine?.currentFloor || detailModal.machine?.floor || '—'}
              </Col>
              <Col span={8}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Line</Typography.Text><br />
                {detailModal.machine?.line || '—'}
              </Col>
              <Col span={12}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Category</Typography.Text><br />
                <Tag>{detailModal.category?.toUpperCase()}</Tag>
              </Col>
              <Col span={12}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Status</Typography.Text><br />
                <Tag color={detailModal.status === 'complete' ? 'green' : 'orange'}>{detailModal.status?.toUpperCase()}</Tag>
              </Col>
              <Col span={24}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Activities</Typography.Text><br />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                  {detailModal.activities?.map((a: string) => <Tag key={a} color="blue">{a}</Tag>)}
                </div>
              </Col>
              <Col span={12}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Performed By</Typography.Text><br />
                {detailModal.performedBy}
              </Col>
              <Col span={12}>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>Date</Typography.Text><br />
                {dayjs(detailModal.performedAt).format('DD MMM YYYY HH:mm')}
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      <style>{`
        .mt-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }
        .mt-card-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }
        @media (max-width: 576px) {
          .mt-header { flex-direction: column; }
          .mt-card-row { flex-direction: column; gap: 8px; }
          .mt-card-row .ant-btn { width: 100%; }
        }
      `}</style>
    </div>
  );
}
