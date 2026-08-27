import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space, Typography, message, Tabs, Card, Row, Col, Statistic, Badge, Descriptions, Popconfirm, AutoComplete } from 'antd';
import { PlusOutlined, CheckOutlined, EyeOutlined, RollbackOutlined, ToolOutlined, DeleteOutlined, FilePdfOutlined, BellOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import { getFullName, machineTypeMap } from '../utils/machineTypes';

const statusLabels: Record<string, string> = {
  requested: 'Requested', approved: 'Approved', denied: 'Denied', received: 'Received',
  condition_confirmed: 'Condition OK', in_use: 'In Use', return_requested: 'Return Requested',
  return_approved: 'Return Approved', returned: 'Returned',
};
const statusColor: Record<string, string> = {
  requested: 'blue', approved: 'cyan', denied: 'red', received: 'geekblue',
  condition_confirmed: 'purple', in_use: 'green', return_requested: 'orange',
  return_approved: 'lime', returned: 'default',
};

const factoryOptions = [
  { value: 'ABM', label: 'ABM' },
  { value: 'AGL', label: 'AGL' },
  { value: 'ASL', label: 'ASL' },
];

export default function Rental() {
  const [rentals, setRentals] = useState<any[]>([]);
  const [activeRentals, setActiveRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [approveModal, setApproveModal] = useState<{ id: number; action: 'approve' | 'deny' } | null>(null);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [sparePartsModal, setSparePartsModal] = useState<any>(null);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [sparePartLoading, setSparePartLoading] = useState(false);
  const [conditionModal, setConditionModal] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<{ machineTypes: string[]; floors: string[]; sections: string[]; lines: string[] }>({ machineTypes: [], floors: [], sections: [], lines: [] });
  const [form] = Form.useForm();
  const [approveForm] = Form.useForm();
  const [sparePartForm] = Form.useForm();
  const [conditionForm] = Form.useForm();
  const { user, isSuperAdmin, isUser, isLineChief, isMechanic } = useAuth();
  const userFactory = user?.facility;
  const userFloor = user?.floor;
  const [filterFactory, setFilterFactory] = useState<string | undefined>(userFactory || undefined);

  const load = () => {
    setLoading(true);
    const params: any = {};
    if (filterFactory) params.factory = filterFactory;
    if ((isLineChief || isMechanic) && userFloor) params.floor = userFloor;
    Promise.all([
      api.get('/rental', { params }),
      api.get('/rental/active', { params }),
    ]).then(([allRes, activeRes]) => {
      setRentals(allRes.data);
      setActiveRentals(activeRes.data);
      setLoading(false);
    });
  };

  const loadSuggestions = () => {
    const facility = userFactory || undefined;
    api.get('/rental/suggestions', { params: { facility } }).then((res) => {
      setSuggestions(res.data);
    });
  };

  useEffect(() => { load(); loadSuggestions(); }, [filterFactory]);

  const handleSubmit = async (values: any) => {
    await api.post('/rental', values);
    message.success('Rental request submitted');
    setModalOpen(false);
    form.resetFields();
    load();
  };

  const handleApproveAction = async (values: { justification: string }) => {
    if (!approveModal) return;
    await api.put(`/rental/${approveModal.id}/${approveModal.action}`, values);
    message.success(approveModal.action === 'approve' ? 'Rental approved' : 'Rental denied');
    setApproveModal(null);
    approveForm.resetFields();
    load();
  };

  const handleNotifyReturn = async (id: number) => {
    await api.put(`/rental/${id}/notify-return`);
    message.success('Work Study / Assignment person notified for return');
    load();
  };

  const handleReturnRequest = async (id: number) => {
    await api.put(`/rental/${id}/request-return`);
    message.success('Return requested');
    load();
  };

  const handleApproveReturn = async (id: number) => {
    await api.put(`/rental/${id}/approve-return`);
    message.success('Return approved — security notified');
    load();
  };

  const handleConfirmCondition = async (values: { note: string }) => {
    if (conditionModal === null) return;
    await api.put(`/rental/${conditionModal}/confirm-condition`, values);
    message.success('Machine condition confirmed');
    setConditionModal(null);
    conditionForm.resetFields();
    load();
  };

  const loadSpareParts = async (rentalId: number) => {
    setSparePartLoading(true);
    const res = await api.get(`/rental/${rentalId}/spare-parts`);
    setSpareParts(res.data);
    setSparePartLoading(false);
  };

  const handleAddSparePart = async (values: any) => {
    await api.post(`/rental/${sparePartsModal.id}/spare-parts`, values);
    message.success('Spare part added');
    sparePartForm.resetFields();
    loadSpareParts(sparePartsModal.id);
  };

  const handleToggleRemoved = async (partId: number, current: boolean) => {
    await api.put(`/rental/spare-parts/${partId}`, { removedBeforeReturn: !current });
    message.success(!current ? 'Marked as removed' : 'Marked as installed');
    loadSpareParts(sparePartsModal.id);
  };

  const handleDeletePart = async (partId: number) => {
    await api.delete(`/rental/spare-parts/${partId}`);
    message.success('Part removed');
    loadSpareParts(sparePartsModal.id);
  };

  const openSpareParts = (rental: any) => {
    setSparePartsModal(rental);
    loadSpareParts(rental.id);
  };

  const printSummary = (rental: any) => {
    const pw = window.open('', '_blank');
    if (!pw) return;
    const fmt = (d: string) => d ? dayjs(d).format('DD MMM YYYY HH:mm') : 'N/A';
    pw.document.write(`<html><head><title>Rental Summary - ${getFullName(rental.machineType)}</title>
<style>
body{font-family:Arial,sans-serif;padding:40px;max-width:750px;margin:0 auto}
h1{text-align:center;font-size:20px;border-bottom:2px solid #000;padding-bottom:8px}
.sub{text-align:center;font-size:13px;color:#555;margin-bottom:24px}
table{width:100%;border-collapse:collapse;margin:16px 0}
th,td{border:1px solid #ccc;padding:8px 12px;text-align:left;font-size:13px}
th{background:#f5f5f5;width:35%}
.section-title{background:#e8e8e8;font-weight:bold;text-align:center;font-size:13px}
.two-col{display:flex;gap:24px;margin-top:24px}
.two-col .col{flex:1}
.footer{margin-top:48px;display:flex;justify-content:space-between}
.sig{border-top:1px solid #000;width:180px;text-align:center;padding-top:4px;font-size:12px}
@media print{body{padding:20px}}
</style></head><body>
<h1>RENTAL SUMMARY REPORT</h1>
<div class="sub">Receiving Doc: <strong>${rental.receivingDocNo || 'N/A'}</strong> &nbsp;&nbsp;|&nbsp;&nbsp; Outing Doc: <strong>${rental.outingDocNo || 'N/A'}</strong></div>
<table>
<tr><td class="section-title" colspan="2">Machine Information</td></tr>
<tr><th>Machine Type</th><td>${getFullName(rental.machineType)}</td></tr>
<tr><th>Model</th><td>${rental.model || 'N/A'}</td></tr>
<tr><th>Serial No</th><td>${rental.serialNo || 'N/A'}</td></tr>
<tr><th>Supplier</th><td>${rental.supplier || 'N/A'}</td></tr>
<tr><td class="section-title" colspan="2">Location</td></tr>
<tr><th>Factory</th><td>${rental.factory || 'N/A'}</td></tr>
<tr><th>Floor</th><td>${rental.floor || 'N/A'}</td></tr>
<tr><th>Section</th><td>${rental.section || 'N/A'}</td></tr>
<tr><th>Line</th><td>${rental.line || 'N/A'}</td></tr>
<tr><th>Estimated Duration</th><td>${rental.estimatedDays || 0} days</td></tr>
<tr><td class="section-title" colspan="2">Request & Approval</td></tr>
<tr><th>Requested By</th><td>${rental.requestedByName || 'N/A'}</td></tr>
<tr><th>Requested At</th><td>${fmt(rental.requestedAt)}</td></tr>
<tr><th>Justification</th><td>${rental.justification || 'N/A'}</td></tr>
<tr><th>Approved By</th><td>${rental.approvedByName || 'N/A'}</td></tr>
<tr><th>Approved At</th><td>${fmt(rental.approvedAt)}</td></tr>
${rental.approvalJustification ? `<tr><th>Approval Note</th><td>${rental.approvalJustification}</td></tr>` : ''}
<tr><td class="section-title" colspan="2">Receiving Details</td></tr>
<tr><th>Receiving Doc No</th><td>${rental.receivingDocNo || 'N/A'}</td></tr>
<tr><th>Received By (Security)</th><td>${rental.receivedBySecurityName || 'N/A'}</td></tr>
<tr><th>Received At</th><td>${fmt(rental.receivedAt)}</td></tr>
<tr><td class="section-title" colspan="2">Condition Check</td></tr>
<tr><th>Confirmed By</th><td>${rental.conditionConfirmedByName || 'N/A'}</td></tr>
<tr><th>Condition Note</th><td>${rental.conditionNote || 'N/A'}</td></tr>
<tr><th>Confirmed At</th><td>${fmt(rental.conditionConfirmedAt)}</td></tr>
<tr><td class="section-title" colspan="2">Return Details</td></tr>
${rental.returnNotifiedByName ? `<tr><th>Return Notified By</th><td>${rental.returnNotifiedByName}</td></tr>
<tr><th>Notified At</th><td>${fmt(rental.returnNotifiedAt)}</td></tr>` : ''}
${rental.returnRequestedByName ? `<tr><th>Return Requested By</th><td>${rental.returnRequestedByName}</td></tr>
<tr><th>Requested At</th><td>${fmt(rental.returnRequestedAt)}</td></tr>` : ''}
<tr><th>Outing Doc No</th><td>${rental.outingDocNo || 'N/A'}</td></tr>
<tr><th>Return Approved By</th><td>${rental.returnApprovedByName || 'N/A'}</td></tr>
<tr><th>Return Approved At</th><td>${fmt(rental.returnApprovedAt)}</td></tr>
<tr><th>Returned By (Security)</th><td>${rental.returnConfirmedByName || 'N/A'}</td></tr>
<tr><th>Returned At</th><td>${fmt(rental.returnedAt)}</td></tr>
</table>
<div class="footer">
<div class="sig">Requested By</div>
<div class="sig">Approved By</div>
<div class="sig">Security Officer</div>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
    pw.document.close();
  };

  const requestedRentals = rentals.filter((r) => r.status === 'requested');
  const activeCount = rentals.filter((r) => ['approved', 'received', 'condition_confirmed', 'in_use'].includes(r.status)).length;
  const returnPending = rentals.filter((r) => r.status === 'return_requested');

  const toAutoOpts = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));
  const machineTypeAutoOpts = () => {
    const fullNames = new Set<string>();
    suggestions.machineTypes.forEach((code) => {
      fullNames.add(machineTypeMap[code] || code);
    });
    Object.values(machineTypeMap).forEach((name) => fullNames.add(name));
    return [...fullNames].sort().map((name) => ({ value: name, label: name }));
  };

  const columns: any[] = [
    { title: 'Machine Type', dataIndex: 'machineType', key: 'type', render: (v: string) => getFullName(v) },
    { title: 'Model', dataIndex: 'model', key: 'model', render: (v: string) => v || '—' },
    { title: 'Factory', dataIndex: 'factory', key: 'factory', render: (v: string) => v ? <Tag>{v}</Tag> : '—' },
    { title: 'Floor', dataIndex: 'floor', key: 'floor', render: (v: string) => v || '—', responsive: ['md'] },
    { title: 'Days', dataIndex: 'estimatedDays', key: 'days', width: 60, render: (v: number) => v || '—' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColor[s]}>{statusLabels[s]}</Tag> },
    { title: 'Requested', dataIndex: 'requestedAt', key: 'time', render: (v: string) => <span style={{ fontSize: 12 }}>{dayjs(v).format('DD MMM YY')}</span> },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, r: any) => (
        <Space size={4} wrap>
          <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setDetailModal(r)} />
          {r.status === 'requested' && isSuperAdmin && (
            <>
              <Button size="small" type="primary" onClick={() => setApproveModal({ id: r.id, action: 'approve' })}>Approve</Button>
              <Button size="small" danger onClick={() => setApproveModal({ id: r.id, action: 'deny' })}>Deny</Button>
            </>
          )}
          {r.status === 'received' && (isLineChief || isMechanic) && (
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => setConditionModal(r.id)}>Confirm Condition</Button>
          )}
          {r.status === 'in_use' && (isLineChief || isMechanic) && !r.returnNotifiedAt && (
            <Button size="small" type="primary" icon={<BellOutlined />} onClick={() => handleNotifyReturn(r.id)}>Notify Return</Button>
          )}
          {r.status === 'in_use' && (isLineChief || isMechanic) && r.returnNotifiedAt && (
            <Tag color="orange">Notified</Tag>
          )}
          {r.status === 'in_use' && isUser && (
            <>
              {r.returnNotifiedAt && <Tag color="orange" icon={<BellOutlined />}>{r.returnNotifiedByName || 'Line Chief'} requested return</Tag>}
              <Button size="small" onClick={() => handleReturnRequest(r.id)} icon={<RollbackOutlined />}>Request Return</Button>
            </>
          )}
          {r.status === 'in_use' && isSuperAdmin && r.returnNotifiedAt && (
            <Tag color="orange" icon={<BellOutlined />}>{r.returnNotifiedByName || 'Line Chief'} requested return</Tag>
          )}
          {r.status === 'return_requested' && isSuperAdmin && (
            <Button size="small" type="primary" onClick={() => handleApproveReturn(r.id)}>Approve Return</Button>
          )}
          {['received', 'condition_confirmed', 'in_use'].includes(r.status) && (
            <Button size="small" icon={<ToolOutlined />} onClick={() => openSpareParts(r)}>Parts</Button>
          )}
          {r.status === 'returned' && isSuperAdmin && (
            <Button size="small" icon={<FilePdfOutlined />} onClick={() => printSummary(r)}>Summary</Button>
          )}
        </Space>
      ),
    },
  ];

  const activeColumns: any[] = [
    { title: 'Machine Type', dataIndex: 'machineType', key: 'type', render: (v: string) => getFullName(v) },
    { title: 'Model', dataIndex: 'model', key: 'model', render: (v: string) => v || '—' },
    { title: 'Factory', dataIndex: 'factory', key: 'factory', render: (v: string) => v ? <Tag>{v}</Tag> : '—',
      filters: factoryOptions.map((f) => ({ text: f.label, value: f.value })),
      onFilter: (value: any, record: any) => record.factory === value,
    },
    { title: 'Floor', dataIndex: 'floor', key: 'floor', render: (v: string) => v || '—' },
    { title: 'Section', dataIndex: 'section', key: 'section', render: (v: string) => v || '—' },
    { title: 'Line', dataIndex: 'line', key: 'line', render: (v: string) => v || '—' },
    { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', render: (v: string) => v || '—' },
    { title: 'Est. Days', dataIndex: 'estimatedDays', key: 'days', width: 80, render: (v: number) => v || '—' },
    { title: 'Received', dataIndex: 'receivedAt', key: 'rcv', render: (v: string) => v ? dayjs(v).format('DD MMM YY') : '—' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColor[s]}>{statusLabels[s]}</Tag> },
    {
      title: '', key: 'actions', width: 80,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setDetailModal(r)} />
          <Button size="small" type="text" icon={<ToolOutlined />} onClick={() => openSpareParts(r)} />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Rental Machines</Typography.Title>
        <Space>
          {isSuperAdmin && (
            <Select
              placeholder="Filter by factory"
              allowClear
              value={filterFactory}
              onChange={setFilterFactory}
              options={factoryOptions}
              style={{ width: 130 }}
              size="small"
            />
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Request Rental</Button>
        </Space>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={8}><Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #1890ff' }}><Statistic title={<span style={{ fontSize: 11 }}>Pending Approval</span>} value={requestedRentals.length} valueStyle={{ fontSize: 20 }} /></Card></Col>
        <Col xs={8}><Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #52c41a' }}><Statistic title={<span style={{ fontSize: 11 }}>Active Rentals</span>} value={activeCount} valueStyle={{ color: '#52c41a', fontSize: 20 }} /></Card></Col>
        <Col xs={8}><Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #fa8c16' }}><Statistic title={<span style={{ fontSize: 11 }}>Return Pending</span>} value={returnPending.length} valueStyle={{ color: '#fa8c16', fontSize: 20 }} /></Card></Col>
      </Row>

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Tabs
          defaultActiveKey="all"
          style={{ padding: '0 12px' }}
          size="small"
          items={[
            {
              key: 'all',
              label: <span>All Requests <Badge count={rentals.length} style={{ backgroundColor: '#1677ff', marginLeft: 4 }} size="small" /></span>,
              children: <Table dataSource={rentals} columns={columns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20, size: 'small' }} scroll={{ x: 900 }} />,
            },
            {
              key: 'active',
              label: <span>Active Machines <Badge count={activeRentals.length} style={{ backgroundColor: '#52c41a', marginLeft: 4 }} size="small" /></span>,
              children: <Table dataSource={activeRentals} columns={activeColumns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20, size: 'small' }} scroll={{ x: 900 }} />,
            },
          ]}
        />
      </Card>

      {/* New rental request modal */}
      <Modal title="New Rental Request" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText="Submit">
        <Form form={form} onFinish={handleSubmit} layout="vertical" initialValues={{ factory: userFactory }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="machineType" label="Machine Type" rules={[{ required: true }]}>
                <AutoComplete
                  options={machineTypeAutoOpts()}
                  placeholder="e.g. Single Needle Lockstitch"
                  filterOption={(input, option) => (option?.value as string).toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="model" label="Model"><Input placeholder="e.g. DDL-8700-7" /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="serialNo" label="Serial No"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="supplier" label="Supplier"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="factory" label="Factory" rules={[{ required: true }]}>
                <Select options={factoryOptions} disabled={!!userFactory} />
              </Form.Item>
            </Col>
            <Col span={12}><Form.Item name="estimatedDays" label="Approx. Days" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} placeholder="e.g. 30" /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="floor" label="Floor" rules={[{ required: true }]}>
                <AutoComplete
                  options={toAutoOpts(suggestions.floors)}
                  placeholder="e.g. 3RD"
                  filterOption={(input, option) => (option?.value as string).toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="section" label="Section" rules={[{ required: true }]}>
                <AutoComplete
                  options={toAutoOpts(suggestions.sections)}
                  placeholder="e.g. SE"
                  filterOption={(input, option) => (option?.value as string).toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="line" label="Line" rules={[{ required: true }]}>
                <AutoComplete
                  options={toAutoOpts(suggestions.lines)}
                  placeholder="e.g. 8"
                  filterOption={(input, option) => (option?.value as string).toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="justification" label="Justification" rules={[{ required: true }]}><Input.TextArea rows={3} placeholder="Why is this rental needed?" /></Form.Item>
        </Form>
      </Modal>

      {/* Approve/Deny modal */}
      <Modal
        title={approveModal?.action === 'approve' ? 'Approve Rental' : 'Deny Rental'}
        open={!!approveModal}
        onCancel={() => setApproveModal(null)}
        onOk={() => approveForm.submit()}
        okText={approveModal?.action === 'approve' ? 'Approve' : 'Deny'}
        okButtonProps={approveModal?.action === 'deny' ? { danger: true } : {}}
      >
        <Form form={approveForm} onFinish={handleApproveAction} layout="vertical">
          <Form.Item name="justification" label="Justification" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      {/* Condition confirmation modal */}
      <Modal title="Confirm Machine Condition" open={conditionModal !== null} onCancel={() => { setConditionModal(null); conditionForm.resetFields(); }} onOk={() => conditionForm.submit()} okText="Confirm OK">
        <Form form={conditionForm} onFinish={handleConfirmCondition} layout="vertical">
          <Form.Item name="note" label="Condition Note" rules={[{ required: true }]}><Input.TextArea rows={3} placeholder="Machine condition is OK / working properly..." /></Form.Item>
        </Form>
      </Modal>

      {/* Detail modal */}
      <Modal title="Rental Details" open={!!detailModal} onCancel={() => setDetailModal(null)} footer={null} width={640}>
        {detailModal && (
          <Descriptions column={1} size="small" bordered labelStyle={{ width: 160, whiteSpace: 'nowrap' }}>
            <Descriptions.Item label="Machine Type">{getFullName(detailModal.machineType)}</Descriptions.Item>
            <Descriptions.Item label="Model">{detailModal.model || '—'}</Descriptions.Item>
            <Descriptions.Item label="Serial No">{detailModal.serialNo || '—'}</Descriptions.Item>
            <Descriptions.Item label="Supplier">{detailModal.supplier || '—'}</Descriptions.Item>
            <Descriptions.Item label="Factory">{detailModal.factory || '—'}</Descriptions.Item>
            <Descriptions.Item label="Est. Days">{detailModal.estimatedDays || 0}</Descriptions.Item>
            <Descriptions.Item label="Floor">{detailModal.floor || '—'}</Descriptions.Item>
            <Descriptions.Item label="Section">{detailModal.section || '—'}</Descriptions.Item>
            <Descriptions.Item label="Line">{detailModal.line || '—'}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={statusColor[detailModal.status]}>{statusLabels[detailModal.status]}</Tag></Descriptions.Item>
            <Descriptions.Item label="Justification">{detailModal.justification}</Descriptions.Item>
            <Descriptions.Item label="Requested">{dayjs(detailModal.requestedAt).format('DD MMM YYYY HH:mm')}</Descriptions.Item>
            {detailModal.requestedByName && <Descriptions.Item label="Requested By">{detailModal.requestedByName}</Descriptions.Item>}
            {detailModal.approvedByName && <Descriptions.Item label="Approved By">{detailModal.approvedByName}</Descriptions.Item>}
            {detailModal.approvalJustification && <Descriptions.Item label="Approval Note">{detailModal.approvalJustification}</Descriptions.Item>}
            {detailModal.receivingDocNo && <Descriptions.Item label="Receiving Doc">{detailModal.receivingDocNo}</Descriptions.Item>}
            {detailModal.receivedBySecurityName && <Descriptions.Item label="Received By">{detailModal.receivedBySecurityName}</Descriptions.Item>}
            {detailModal.conditionConfirmedByName && <Descriptions.Item label="Condition By">{detailModal.conditionConfirmedByName}</Descriptions.Item>}
            {detailModal.conditionNote && <Descriptions.Item label="Condition Note">{detailModal.conditionNote}</Descriptions.Item>}
            {detailModal.returnNotifiedByName && <Descriptions.Item label="Return Notified By">{detailModal.returnNotifiedByName} — {dayjs(detailModal.returnNotifiedAt).format('DD MMM YYYY HH:mm')}</Descriptions.Item>}
            {detailModal.returnRequestedByName && <Descriptions.Item label="Return Requested By">{detailModal.returnRequestedByName} — {dayjs(detailModal.returnRequestedAt).format('DD MMM YYYY HH:mm')}</Descriptions.Item>}
            {detailModal.returnApprovedByName && <Descriptions.Item label="Return Approved">{detailModal.returnApprovedByName}</Descriptions.Item>}
            {detailModal.outingDocNo && <Descriptions.Item label="Outing Doc">{detailModal.outingDocNo}</Descriptions.Item>}
            {detailModal.returnConfirmedByName && <Descriptions.Item label="Return Confirmed">{detailModal.returnConfirmedByName}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>

      {/* Spare parts modal */}
      <Modal title={`Spare Parts — ${sparePartsModal?.machineType || ''}`} open={!!sparePartsModal} onCancel={() => { setSparePartsModal(null); setSpareParts([]); }} footer={null} width={640}>
        {sparePartsModal && (
          <div>
            <Form form={sparePartForm} onFinish={handleAddSparePart} layout="inline" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 4 }}>
              <Form.Item name="partName" rules={[{ required: true, message: 'Name' }]}><Input placeholder="Part name" size="small" style={{ width: 140 }} /></Form.Item>
              <Form.Item name="partNo"><Input placeholder="Part No" size="small" style={{ width: 100 }} /></Form.Item>
              <Form.Item name="quantity" initialValue={1}><InputNumber min={1} size="small" style={{ width: 60 }} /></Form.Item>
              <Form.Item name="providedBy" initialValue="supplier">
                <Select size="small" style={{ width: 110 }} options={[{ value: 'supplier', label: 'Supplier' }, { value: 'factory', label: 'Factory' }]} />
              </Form.Item>
              <Form.Item name="note"><Input placeholder="Note" size="small" style={{ width: 120 }} /></Form.Item>
              <Form.Item><Button type="primary" size="small" htmlType="submit" icon={<PlusOutlined />}>Add</Button></Form.Item>
            </Form>

            <Table
              dataSource={spareParts}
              loading={sparePartLoading}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: 'Part', dataIndex: 'partName', key: 'name' },
                { title: 'Part No', dataIndex: 'partNo', key: 'no', render: (v: string) => v || '—' },
                { title: 'Qty', dataIndex: 'quantity', key: 'qty', width: 50 },
                { title: 'By', dataIndex: 'providedBy', key: 'by', width: 80, render: (v: string) => <Tag color={v === 'supplier' ? 'blue' : 'orange'}>{v}</Tag> },
                { title: 'Removed', dataIndex: 'removedBeforeReturn', key: 'removed', width: 80,
                  render: (v: boolean, r: any) => (
                    <Button size="small" type={v ? 'primary' : 'default'} danger={v} onClick={() => handleToggleRemoved(r.id, v)}>
                      {v ? 'Yes' : 'No'}
                    </Button>
                  ),
                },
                { title: 'Note', dataIndex: 'note', key: 'note', render: (v: string) => v || '—' },
                { title: '', key: 'del', width: 40,
                  render: (_: any, r: any) => (
                    <Popconfirm title="Delete?" onConfirm={() => handleDeletePart(r.id)}>
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
