import { useEffect, useState, useRef } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Space, Typography, message, Card, Divider, Row, Col, Statistic, Badge, Tooltip } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, PrinterOutlined, EyeOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getMachineTypeDisplay, machineTypeOptions } from '../utils/machineTypes';

const sectionOptions = [
  { value: 'SE', label: 'SE - Sewing' },
  { value: 'CU', label: 'CU - Cutting' },
  { value: 'UT', label: 'UT - Utility' },
  { value: 'FN', label: 'FN - Finishing' },
];


const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: 'success', label: 'Active' },
  pending_super_admin: { color: 'warning', label: 'Pending (WS)' },
  pending_admin: { color: 'processing', label: 'Pending (Admin)' },
  rejected: { color: 'error', label: 'Rejected' },
  under_repair: { color: 'warning', label: 'Under Repair' },
  in_transit: { color: 'processing', label: 'In Transit' },
  transferred: { color: 'default', label: 'Transferred' },
  on_loan: { color: 'warning', label: 'On Loan' },
};

function QrTagPrint({ machine }: { machine: any }) {
  const tagRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    if (!tagRef.current) return;
    const pw = window.open('', '_blank', 'width=400,height=120');
    if (!pw) return;
    const td = getMachineTypeDisplay(machine.machineType);
    pw.document.write(`<html><head><title>QR Tag - ${machine.machineId}</title><style>@page{size:4in 1in;margin:0}body{margin:0;padding:0}.tag{display:flex;align-items:center;gap:8px;padding:4px 8px;width:4in;height:1in;box-sizing:border-box;font-family:Arial,sans-serif}.tag svg{flex-shrink:0}.info{flex:1;overflow:hidden}.info .aid{font-size:22px;font-weight:bold;margin:0;letter-spacing:1px}.info .d{font-size:9px;margin:0;color:#333}</style></head><body><div class="tag">${tagRef.current.querySelector('svg')?.outerHTML||''}<div class="info"><p class="aid">${machine.machineId}</p><p class="d">${td.fullName} | ${machine.brand || ''} ${machine.modelNo || ''}</p><p class="d">S/N: ${machine.mfgSerialNo||'N/A'}</p></div></div><script>window.onload=function(){window.print();window.close();}<\/script></body></html>`);
    pw.document.close();
  };
  const handleSaveSvg = () => {
    if (!tagRef.current) return;
    const qrSvg = tagRef.current.querySelector('svg');
    if (!qrSvg) return;
    const qrMarkup = new XMLSerializer().serializeToString(qrSvg);
    const td = getMachineTypeDisplay(machine.machineType);
    const qrEmbed = qrMarkup.replace(/<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" x="18" y="15" width="148" height="148" viewBox="0 0 72 72">`);
    const tagSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="580" height="180" viewBox="0 0 580 180">
  <rect width="580" height="180" fill="#fafafa" rx="8" stroke="#d9d9d9" stroke-dasharray="6,4"/>
  ${qrEmbed}
  <text x="185" y="55" font-family="Arial,sans-serif" font-size="36" font-weight="bold" letter-spacing="1.5" fill="#000">${machine.machineId}</text>
  <text x="185" y="95" font-family="Arial,sans-serif" font-size="16" fill="#666">${td.fullName} | ${machine.brand || ''} ${machine.modelNo || ''}</text>
  <text x="185" y="130" font-family="Arial,sans-serif" font-size="14" fill="#888">S/N: ${machine.mfgSerialNo || 'N/A'}</text>
</svg>`;
    const blob = new Blob([tagSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${machine.machineId}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <div ref={tagRef} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, border: '1px dashed #d9d9d9', borderRadius: 8, background: '#fafafa' }}>
        <QRCodeSVG value={machine.machineId} size={72} level="M" />
        <div>
          <Typography.Title level={3} style={{ margin: 0, letterSpacing: 1 }}>{machine.machineId}</Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{getMachineTypeDisplay(machine.machineType).fullName} | {machine.brand || ''} {machine.modelNo || ''}</Typography.Text><br />
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>S/N: {machine.mfgSerialNo || 'N/A'}</Typography.Text>
        </div>
      </div>
      <Space style={{ marginTop: 8, width: '100%' }}>
        <Button icon={<PrinterOutlined />} onClick={handlePrint} size="small" style={{ flex: 1 }}>Print QR Tag</Button>
        <Button icon={<DownloadOutlined />} onClick={handleSaveSvg} size="small" style={{ flex: 1 }}>Save QR (.svg)</Button>
      </Space>
    </div>
  );
}

export default function Inventory() {
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [rejectModal, setRejectModal] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const isAdminOnly = user?.role === 'admin';
  const [selectedFactory, setSelectedFactory] = useState<string | null>(isAdminOnly && user?.facility ? user.facility : null);

  const load = () => {
    setLoading(true);
    const params: any = {};
    if (search) params.search = search;
    if (selectedFactory) params.facility = selectedFactory;
    api.get('/machines', { params }).then((res) => {
      setMachines(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [search, selectedFactory]);

  const handleSubmit = async (values: any) => {
    await api.post('/machines', values);
    message.success('Machine submitted for approval');
    setModalOpen(false);
    form.resetFields();
    load();
  };

  const handleFirstApprove = async (id: number) => {
    await api.put(`/machines/${id}/first-approve`);
    message.success('Approved — forwarded to Administration');
    load();
  };

  const handleSecondApprove = async (id: number) => {
    await api.put(`/machines/${id}/second-approve`);
    message.success('Approved — now active');
    load();
  };

  const handleReject = async (values: { reason: string }) => {
    await api.put(`/machines/${rejectModal}/reject`, values);
    message.success('Machine rejected');
    setRejectModal(null);
    rejectForm.resetFields();
    load();
  };

  const activeCount = machines.filter((m) => m.status === 'active').length;
  const pendingCount = machines.filter((m) => ['pending_super_admin', 'pending_admin'].includes(m.status)).length;

  const uniqueSections = [...new Set(machines.map((m) => m.section || 'SE'))].sort();
  const uniqueTypes = [...new Set(machines.map((m) => m.machineType))].sort();
  const uniqueFloors = [...new Set(machines.map((m) => m.currentFloor || m.floor))].sort();
  const uniqueFactories = [...new Set(machines.map((m) => m.currentFacility || m.facility))].sort();

  const columns: ColumnsType<any> = [
    {
      title: 'Machine No', dataIndex: 'machineId', key: 'machineId',
      sorter: (a: any, b: any) => a.machineId.localeCompare(b.machineId),
      defaultSortOrder: 'ascend',
      ellipsis: true,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{v}</span>,
    },
    {
      title: 'Section', dataIndex: 'section', key: 'section',
      filters: uniqueSections.map((s) => ({ text: `${s}`, value: s })),
      onFilter: (value: any, record: any) => (record.section || 'SE') === value,
      sorter: (a: any, b: any) => (a.section || 'SE').localeCompare(b.section || 'SE'),
      width: 70,
      render: (v: string) => <Tag style={{ margin: 0, fontSize: 11 }}>{v || 'SE'}</Tag>,
    },
    {
      title: 'Type', dataIndex: 'machineType', key: 'type',
      filters: [...new Map(uniqueTypes.map((t) => { const fn = getMachineTypeDisplay(t).fullName; return [fn, { text: fn, value: fn }]; })).values()].sort((a, b) => a.text.localeCompare(b.text)),
      onFilter: (value: any, record: any) => getMachineTypeDisplay(record.machineType).fullName === value,
      sorter: (a: any, b: any) => getMachineTypeDisplay(a.machineType).fullName.localeCompare(getMachineTypeDisplay(b.machineType).fullName),
      width: 200,
      ellipsis: true,
      render: (v: string) => { const d = getMachineTypeDisplay(v); return <span style={{ fontSize: 12 }}>{d.fullName}</span>; },
    },
    {
      title: 'Brand / Model', key: 'brandModel',
      ellipsis: true,
      render: (_: any, r: any) => (
        <span>
          <span style={{ fontWeight: 500, fontSize: 12 }}>{r.brand || '—'}</span>
          {r.modelNo && <span style={{ color: '#8c8c8c', fontSize: 11 }}> {r.modelNo}</span>}
        </span>
      ),
      sorter: (a: any, b: any) => (a.brand || '').localeCompare(b.brand || ''),
    },
    {
      title: 'Floor', dataIndex: 'currentFloor', key: 'floor',
      filters: uniqueFloors.map((f) => ({ text: f, value: f })),
      onFilter: (value: any, record: any) => (record.currentFloor || record.floor) === value,
      sorter: (a: any, b: any) => (a.currentFloor || a.floor || '').localeCompare(b.currentFloor || b.floor || ''),
      width: 65,
      render: (v: string) => <Tag color="geekblue" style={{ margin: 0, fontSize: 11 }}>{v}</Tag>,
    },
    {
      title: 'Factory', dataIndex: 'currentFacility', key: 'facility',
      filters: uniqueFactories.map((f) => ({ text: f, value: f })),
      onFilter: (value: any, record: any) => (record.currentFacility || record.facility) === value,
      width: 60,
      render: (v: string) => <span style={{ fontWeight: 500, fontSize: 12 }}>{v}</span>,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      filters: Object.entries(statusConfig).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (value: any, record: any) => record.status === value,
      width: 100,
      render: (s: string) => {
        const cfg = statusConfig[s] || { color: 'default', label: s };
        return <Badge status={cfg.color as any} text={<span style={{ fontSize: 12 }}>{cfg.label}</span>} />;
      },
    },
    {
      title: '', key: 'actions', width: 40, align: 'center' as const,
      render: (_: any, record: any) => (
        <Space size={2}>
          <Tooltip title="View">
            <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setDetailModal(record)} style={{ padding: '0 4px' }} />
          </Tooltip>
          {isSuperAdmin && record.status === 'pending_super_admin' && (
            <>
              <Tooltip title="Approve"><Button size="small" type="text" style={{ color: '#52c41a', padding: '0 4px' }} icon={<CheckOutlined />} onClick={() => handleFirstApprove(record.id)} /></Tooltip>
              <Tooltip title="Reject"><Button size="small" type="text" danger icon={<CloseOutlined />} onClick={() => setRejectModal(record.id)} style={{ padding: '0 4px' }} /></Tooltip>
            </>
          )}
          {isAdmin && record.status === 'pending_admin' && (
            <>
              <Tooltip title="Approve"><Button size="small" type="text" style={{ color: '#52c41a', padding: '0 4px' }} icon={<CheckOutlined />} onClick={() => handleSecondApprove(record.id)} /></Tooltip>
              <Tooltip title="Reject"><Button size="small" type="text" danger icon={<CloseOutlined />} onClick={() => setRejectModal(record.id)} style={{ padding: '0 4px' }} /></Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <style>{`
        .inv-table .ant-table { font-size: 13px; }
        .inv-table .ant-table-thead > tr > th { font-size: 12px; font-weight: 600; white-space: nowrap; padding: 8px 8px !important; background: #fafafa; }
        .inv-table .ant-table-tbody > tr > td { padding: 6px 8px !important; }
        .inv-table .ant-table-column-sorters { justify-content: flex-start; gap: 2px; }
        .inv-table .ant-table-filter-trigger { margin-inline-end: -4px; }
        @media (max-width: 768px) {
          .inv-stats .ant-col { flex: 0 0 50% !important; max-width: 50% !important; margin-bottom: 8px; }
          .inv-header { flex-direction: column; gap: 12px; align-items: flex-start !important; }
        }
        @media (max-width: 480px) {
          .inv-stats .ant-col { flex: 0 0 100% !important; max-width: 100% !important; }
        }
      `}</style>

      <div className="inv-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Machine Inventory
            {selectedFactory && <Tag color="blue" style={{ marginLeft: 8, verticalAlign: 'middle' }}>{selectedFactory}</Tag>}
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {isAdminOnly ? `${user?.facility} factory inventory` : selectedFactory ? `Showing ${selectedFactory} factory` : 'Select a factory to filter'}
          </Typography.Text>
        </div>
        <Space size={8} wrap>
          {isSuperAdmin && (
            <Select
              placeholder="Factory"
              value={selectedFactory}
              onChange={setSelectedFactory}
              allowClear
              style={{ width: 100 }}
              size="small"
              options={[{ value: 'AGL', label: 'AGL' }, { value: 'AJL', label: 'AJL' }, { value: 'ABM', label: 'ABM' }, { value: 'ASL', label: 'ASL' }]}
            />
          )}
          <Input.Search placeholder="Search..." onSearch={setSearch} allowClear style={{ width: 200 }} size="small" prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />} />
          <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => setModalOpen(true)}>Register</Button>
        </Space>
      </div>

      <Row gutter={[8, 8]} className="inv-stats" style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #52c41a' }}><Statistic title={<span style={{ fontSize: 11 }}>Active</span>} value={activeCount} valueStyle={{ color: '#52c41a', fontSize: 20 }} /></Card></Col>
        <Col span={6}><Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #faad14' }}><Statistic title={<span style={{ fontSize: 11 }}>Pending</span>} value={pendingCount} valueStyle={{ color: '#faad14', fontSize: 20 }} /></Card></Col>
        <Col span={6}><Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #1677ff' }}><Statistic title={<span style={{ fontSize: 11 }}>Total</span>} value={machines.length} valueStyle={{ color: '#1677ff', fontSize: 20 }} /></Card></Col>
        <Col span={6}><Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #722ed1' }}><Statistic title={<span style={{ fontSize: 11 }}>Factories</span>} value={uniqueFactories.length} valueStyle={{ color: '#722ed1', fontSize: 20 }} /></Card></Col>
      </Row>

      <div className="inv-table">
        <Table
          dataSource={machines}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ x: 800 }}
          pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100', '200'], size: 'small', showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}` }}
          tableLayout="auto"
        />
      </div>

      <Modal title="Register New Machine" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText="Submit for Approval" width={560}>
        <Form form={form} onFinish={handleSubmit} layout="vertical" initialValues={{ section: 'SE' }} size="small">
          <Row gutter={12}>
            <Col span={12}><Form.Item name="machineId" label="Machine No" rules={[{ required: true }]}><Input placeholder="e.g. AGL-SNLS-00019" /></Form.Item></Col>
            <Col span={12}><Form.Item name="section" label="Section" rules={[{ required: true }]}><Select options={sectionOptions} /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="machineType" label="Machine Type" rules={[{ required: true }]}><Select options={machineTypeOptions} showSearch optionFilterProp="label" /></Form.Item></Col>
            <Col span={12}><Form.Item name="brand" label="Brand"><Input placeholder="e.g. JUKI" /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="modelNo" label="Model No."><Input placeholder="e.g. DDL-8700-7" /></Form.Item></Col>
            <Col span={12}><Form.Item name="mfgSerialNo" label="Serial No."><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="year" label="Year"><Input placeholder="2006" /></Form.Item></Col>
            <Col span={8}><Form.Item name="facility" label="Factory" rules={[{ required: true }]}><Select options={[{ value: 'AGL' }, { value: 'AJL' }, { value: 'ABM' }, { value: 'ASL' }]} /></Form.Item></Col>
            <Col span={8}><Form.Item name="floor" label="Floor" rules={[{ required: true }]}><Input placeholder="4TH" /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}><Form.Item name="line" label="Line"><Input placeholder="SAMPLE, LINE-1" /></Form.Item></Col>
            <Col span={12}><Form.Item name="remarks" label="Remarks"><Input /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal title="Reject Machine" open={rejectModal !== null} onCancel={() => setRejectModal(null)} onOk={() => rejectForm.submit()} okText="Reject" okButtonProps={{ danger: true }}>
        <Form form={rejectForm} onFinish={handleReject} layout="vertical">
          <Form.Item name="reason" label="Rejection Reason" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={null} open={!!detailModal} onCancel={() => setDetailModal(null)} footer={null} width={560}>
        {detailModal && (
          <div>
            <Typography.Title level={5} style={{ textAlign: 'center', marginBottom: 12 }}>Machine Details</Typography.Title>
            <QrTagPrint machine={detailModal} /><Divider style={{ margin: '12px 0' }} />
            <Row gutter={[12, 8]} style={{ fontSize: 13 }}>
              <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Asset ID</Typography.Text><br /><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{detailModal.assetId || 'Not assigned'}</span></Col>
              <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Machine No</Typography.Text><br /><span style={{ fontFamily: 'monospace' }}>{detailModal.machineId}</span></Col>
              <Col span={8}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Section</Typography.Text><br />{detailModal.section || 'SE'}</Col>
              <Col span={8}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Status</Typography.Text><br /><Badge status={(statusConfig[detailModal.status]?.color || 'default') as any} text={statusConfig[detailModal.status]?.label || detailModal.status} /></Col>
              <Col span={24}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Type</Typography.Text><br /><span style={{ fontSize: 13, fontWeight: 500 }}>{getMachineTypeDisplay(detailModal.machineType).fullName}</span></Col>
              <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Brand</Typography.Text><br />{detailModal.brand || '—'}</Col>
              <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Model</Typography.Text><br />{detailModal.modelNo || '—'}</Col>
              <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Serial No</Typography.Text><br />{detailModal.mfgSerialNo || '—'}</Col>
              <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Year</Typography.Text><br />{detailModal.year || '—'}</Col>
              <Col span={8}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Factory</Typography.Text><br /><strong>{detailModal.facility}</strong></Col>
              <Col span={8}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Floor</Typography.Text><br />{detailModal.floor}</Col>
              <Col span={8}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Line</Typography.Text><br />{detailModal.line || '—'}</Col>
              <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Location</Typography.Text><br />{detailModal.currentFacility} / {detailModal.currentFloor}</Col>
              <Col span={12}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Submitted By</Typography.Text><br />{detailModal.submitterName || '—'}</Col>
              {detailModal.remarks && <Col span={24}><Typography.Text type="secondary" style={{ fontSize: 11 }}>Remarks</Typography.Text><br />{detailModal.remarks}</Col>}
            </Row>
            {detailModal.rejectionReason && (
              <div style={{ marginTop: 12, padding: 8, background: '#fff2f0', borderRadius: 6, border: '1px solid #ffccc7', fontSize: 13 }}>
                <Typography.Text type="danger" strong style={{ fontSize: 12 }}>Rejection Reason:</Typography.Text> <Typography.Text type="danger">{detailModal.rejectionReason}</Typography.Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
