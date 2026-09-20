import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Space, Typography, message, DatePicker, Row, Col } from 'antd';
import { PlusOutlined, PrinterOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const facilityNames: Record<string, string> = {
  AGL: 'Ananta Garments Ltd.',
  AJL: 'Ananta Jeanswear Ltd.',
  ABM: 'ABM Fashion Ltd.',
  ASL: 'Ananta Sportswear Ltd.',
};

const statusLabels: Record<string, string> = {
  requested: 'Requested',
  first_approved: '1st Approved (Work Study)',
  second_approved: '2nd Approved (Admin)',
  dispatched: 'Dispatched',
  received: 'Received',
  rejected: 'Rejected',
  return_requested: 'Return Requested',
  return_approved: 'Returned',
};

export default function Transfers() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [machines, setMachines] = useState<any[]>([]);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [rejectModal, setRejectModal] = useState<number | null>(null);
  const [chalanData, setChalanData] = useState<any>(null);
  const [facilityFilter, setFacilityFilter] = useState<string | undefined>(undefined);
  const [basisValue, setBasisValue] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ floors: string[]; sections: string[]; lines: string[] }>({ floors: [], sections: [], lines: [] });
  const [form] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const { user, isSuperAdmin, isAdmin } = useAuth();

  const load = () => {
    setLoading(true);
    api.get('/transfers', { params: { facility: facilityFilter } }).then((res) => { setTransfers(res.data); setLoading(false); });
  };

  const loadSuggestions = () => {
    api.get('/rental/suggestions').then((res) => {
      setSuggestions({ floors: res.data.floors || [], sections: res.data.sections || [], lines: res.data.lines || [] });
    });
  };

  useEffect(() => { load(); loadSuggestions(); }, [facilityFilter]);

  const openCreateModal = async () => {
    const res = await api.get('/machines', { params: { status: 'active' } });
    setMachines(res.data);
    setBasisValue(null);
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    const payload = {
      ...values,
      expectedReturnDate: values.expectedReturnDate ? values.expectedReturnDate.format('YYYY-MM-DD') : null,
    };
    await api.post('/transfers', payload);
    message.success('Transfer request submitted');
    setModalOpen(false);
    form.resetFields();
    setBasisValue(null);
    load();
  };

  const handleAction = async (id: number, action: string) => {
    await api.put(`/transfers/${id}/${action}`);
    message.success('Transfer updated');
    load();
    setDetailModal(null);
  };

  const handleReject = async (values: { reason: string }) => {
    await api.put(`/transfers/${rejectModal}/reject`, values);
    message.success('Transfer rejected');
    setRejectModal(null);
    rejectForm.resetFields();
    load();
  };

  const openChalan = async (id: number) => {
    const res = await api.get(`/transfers/${id}/chalan`);
    if (res.data.error) { message.error(res.data.error); return; }
    setChalanData(res.data);
  };

  const printChalan = () => {
    const el = document.getElementById('chalan-print');
    if (!el) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Chalan ${chalanData.chalanNo}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; }
        @media print { body { padding: 10px; } .no-print { display: none; } }
      </style></head><body>${el.innerHTML}
      <script>window.onload = function() { window.print(); }</script>
      </body></html>`);
    win.document.close();
  };

  const statusColor: Record<string, string> = {
    requested: 'blue', first_approved: 'cyan', second_approved: 'geekblue',
    dispatched: 'orange', received: 'green', rejected: 'red',
    return_requested: 'volcano', return_approved: 'green',
  };

  const columns = [
    { title: 'Machine No', dataIndex: ['machine', 'machineId'], key: 'asset', render: (v: string) => v ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> : 'N/A' },
    { title: 'From', key: 'from', render: (_: any, r: any) => `${r.fromFacility} / ${r.fromFloor}${r.fromSection ? ' / ' + r.fromSection : ''}${r.fromLine ? ' / L' + r.fromLine : ''}` },
    { title: 'To', key: 'to', render: (_: any, r: any) => `${r.toFacility} / ${r.toFloor}${r.toSection ? ' / ' + r.toSection : ''}${r.toLine ? ' / L' + r.toLine : ''}` },
    {
      title: 'Basis', dataIndex: 'basis', key: 'basis',
      render: (v: string, r: any) => (
        <span>
          <Tag color={v === 'permanent' ? 'purple' : v === 'internal' ? 'gold' : 'cyan'} style={{ margin: 0 }}>{v?.toUpperCase()}</Tag>
          {v === 'loan' && r.expectedReturnDate && (
            <span style={{ fontSize: 10, color: dayjs(r.expectedReturnDate).isBefore(dayjs(), 'day') && ['received', 'return_requested'].includes(r.status) ? '#ff4d4f' : '#8c8c8c', marginLeft: 4 }}>
              Due: {dayjs(r.expectedReturnDate).format('DD MMM')}
            </span>
          )}
        </span>
      ),
    },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColor[s]}>{statusLabels[s]}</Tag> },
    { title: 'Requested', dataIndex: 'requestedAt', key: 'time', render: (v: string) => dayjs(v).format('DD MMM HH:mm') },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => setDetailModal(record)}>View</Button>
          {record.status === 'requested' && isSuperAdmin && (
            <Button size="small" type="primary" onClick={() => handleAction(record.id, 'first-approve')}>1st Approve</Button>
          )}
          {record.status === 'first_approved' && (isSuperAdmin || isAdmin) && (
            <Button size="small" type="primary" onClick={() => handleAction(record.id, 'second-approve')}>2nd Approve</Button>
          )}
          {record.chalanNo && (
            <Button size="small" icon={<PrinterOutlined />} onClick={() => openChalan(record.id)}>Chalan</Button>
          )}
          {record.status === 'second_approved' && (isSuperAdmin || isAdmin) && (
            <Button size="small" type="primary" onClick={() => handleAction(record.id, 'dispatch')}>Dispatch</Button>
          )}
          {record.status === 'dispatched' && user?.facility === record.toFacility && (
            <Button size="small" type="primary" onClick={() => handleAction(record.id, 'receive')}>Receive</Button>
          )}
          {record.status === 'return_requested' && isSuperAdmin && (
            <Button size="small" type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }} onClick={() => handleAction(record.id, 'approve-return')}>Approve Return</Button>
          )}
          {!['received', 'rejected', 'return_requested', 'return_approved'].includes(record.status) && (isSuperAdmin || isAdmin) && (
            <Button size="small" danger onClick={() => setRejectModal(record.id)}>Reject</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Transfers</Typography.Title>
        <Space>
          <Select
            placeholder="Filter by Factory"
            allowClear
            onChange={(v) => setFacilityFilter(v)}
            style={{ width: 160 }}
            options={[
              { value: 'AGL', label: 'AGL' },
              { value: 'AJL', label: 'AJL' },
              { value: 'ABM', label: 'ABM' },
              { value: 'ASL', label: 'ASL' },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>New Transfer</Button>
        </Space>
      </div>

      <Table dataSource={transfers} columns={columns} rowKey="id" loading={loading} size="small" />

      <Modal title="New Transfer Request" open={modalOpen} onCancel={() => { setModalOpen(false); setBasisValue(null); }} onOk={() => form.submit()} okText="Submit">
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="machineId" label="Machine" rules={[{ required: true }]}>
            <Select showSearch placeholder="Select machine" optionFilterProp="label"
              options={machines.map((m: any) => ({ value: m.id, label: `${m.machineId} - ${m.machineType} (${m.currentFacility})` }))} />
          </Form.Item>
          <Form.Item name="basis" label="Transfer Type" rules={[{ required: true }]}>
            <Select options={[{ value: 'loan', label: 'Loan (Temporary)' }, { value: 'permanent', label: 'Permanent Transfer' }, { value: 'internal', label: 'Internal (Floor Change)' }]} onChange={(v) => { setBasisValue(v); if (v === 'internal') form.setFieldsValue({ toFacility: form.getFieldValue('fromFacility') }); }} />
          </Form.Item>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>From</Typography.Text>
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="fromFacility" label="Factory" rules={[{ required: true }]}>
                <Select options={[{ value: 'AGL', label: 'AGL' }, { value: 'AJL', label: 'AJL' }, { value: 'ABM', label: 'ABM' }, { value: 'ASL', label: 'ASL' }]} onChange={(v) => { if (basisValue === 'internal') form.setFieldsValue({ toFacility: v }); }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="fromFloor" label="Floor" rules={[{ required: true }]}>
                <Select showSearch allowClear placeholder="Floor" options={suggestions.floors.map((f) => ({ value: f, label: f }))} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="fromSection" label="Section">
                <Select showSearch allowClear placeholder="Section" options={suggestions.sections.map((s) => ({ value: s, label: s }))} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="fromLine" label="Line">
                <Select showSearch allowClear placeholder="Line" options={suggestions.lines.map((l) => ({ value: l, label: l }))} />
              </Form.Item>
            </Col>
          </Row>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>{basisValue === 'internal' ? 'Move To' : 'To'}</Typography.Text>
          <Row gutter={12}>
            {basisValue !== 'internal' && (
              <Col span={6}>
                <Form.Item name="toFacility" label="Factory" rules={[{ required: true }]}>
                  <Select options={[{ value: 'AGL', label: 'AGL' }, { value: 'AJL', label: 'AJL' }, { value: 'ABM', label: 'ABM' }, { value: 'ASL', label: 'ASL' }]} />
                </Form.Item>
              </Col>
            )}
            <Col span={basisValue === 'internal' ? 8 : 6}>
              <Form.Item name="toFloor" label="Floor" rules={[{ required: true }]}>
                <Select showSearch allowClear placeholder="Floor" options={suggestions.floors.map((f) => ({ value: f, label: f }))} />
              </Form.Item>
            </Col>
            <Col span={basisValue === 'internal' ? 8 : 6}>
              <Form.Item name="toSection" label="Section">
                <Select showSearch allowClear placeholder="Section" options={suggestions.sections.map((s) => ({ value: s, label: s }))} />
              </Form.Item>
            </Col>
            <Col span={basisValue === 'internal' ? 8 : 6}>
              <Form.Item name="toLine" label="Line">
                <Select showSearch allowClear placeholder="Line" options={suggestions.lines.map((l) => ({ value: l, label: l }))} />
              </Form.Item>
            </Col>
          </Row>
          {basisValue === 'loan' && (
            <Form.Item name="expectedReturnDate" label="Expected Return Date" rules={[{ required: true, message: 'Return date is required for loans' }]}>
              <DatePicker style={{ width: '100%' }} disabledDate={(d) => d.isBefore(dayjs(), 'day')} placeholder="Select return date" />
            </Form.Item>
          )}
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Reject Transfer" open={rejectModal !== null} onCancel={() => setRejectModal(null)} onOk={() => rejectForm.submit()} okText="Reject" okButtonProps={{ danger: true }}>
        <Form form={rejectForm} onFinish={handleReject} layout="vertical">
          <Form.Item name="reason" label="Rejection Reason" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={`Chalan — ${chalanData?.chalanNo || ''}`} open={!!chalanData} onCancel={() => setChalanData(null)} width={700}
        footer={<Button type="primary" icon={<PrinterOutlined />} onClick={printChalan}>Print Chalan</Button>}>
        {chalanData && (
          <div id="chalan-print">
            <div style={{ border: '2px solid #000', padding: 24 }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{facilityNames[chalanData.from.facility] || chalanData.from.facility}</h2>
                <h3 style={{ margin: '4px 0', fontSize: 16 }}>Machine Transfer Chalan</h3>
                <div style={{ fontSize: 12, color: '#666' }}>Delivery Note / Gate Pass</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13 }}>
                <div><strong>Chalan No:</strong> {chalanData.chalanNo}</div>
                <div><strong>Date:</strong> {dayjs(chalanData.date).format('DD MMM YYYY')}</div>
                <div><strong>Type:</strong> {chalanData.basis?.toUpperCase()}</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'left' }} colSpan={2}>Machine Details</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Machine ID', chalanData.machine?.machineId],
                    ['Machine Type', chalanData.machine?.machineType],
                    ['Brand', chalanData.machine?.brand || 'N/A'],
                    ['Model No', chalanData.machine?.modelNo || 'N/A'],
                    ['Serial No', chalanData.machine?.mfgSerialNo || 'N/A'],
                  ].map(([label, val]) => (
                    <tr key={label as string}>
                      <td style={{ border: '1px solid #000', padding: '4px 10px', width: 160, fontWeight: 600 }}>{label}</td>
                      <td style={{ border: '1px solid #000', padding: '4px 10px' }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'left' }}>Transfer From</th>
                    <th style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'left' }}>Transfer To</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '6px 10px' }}>
                      <div><strong>Factory:</strong> {chalanData.from.facility}</div>
                      <div><strong>Floor:</strong> {chalanData.from.floor}</div>
                      {chalanData.from.section && <div><strong>Section:</strong> {chalanData.from.section}</div>}
                      {chalanData.from.line && <div><strong>Line:</strong> {chalanData.from.line}</div>}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '6px 10px' }}>
                      <div><strong>Factory:</strong> {chalanData.to.facility}</div>
                      <div><strong>Floor:</strong> {chalanData.to.floor}</div>
                      {chalanData.to.section && <div><strong>Section:</strong> {chalanData.to.section}</div>}
                      {chalanData.to.line && <div><strong>Line:</strong> {chalanData.to.line}</div>}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style={{ fontSize: 13, marginBottom: 16 }}>
                <strong>Reason:</strong> {chalanData.reason}
              </div>
              {chalanData.basis === 'loan' && chalanData.expectedReturnDate && (
                <div style={{ fontSize: 13, marginBottom: 16, padding: 8, background: '#fffbe6', border: '1px solid #ffe58f' }}>
                  <strong>Expected Return Date:</strong> {dayjs(chalanData.expectedReturnDate).format('DD MMM YYYY')}
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'left' }}>Requested By</th>
                    <th style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'left' }}>1st Approved By</th>
                    <th style={{ border: '1px solid #000', padding: '6px 10px', textAlign: 'left' }}>2nd Approved By</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '6px 10px' }}>{chalanData.requestedBy}</td>
                    <td style={{ border: '1px solid #000', padding: '6px 10px' }}>{chalanData.firstApprovedBy}</td>
                    <td style={{ border: '1px solid #000', padding: '6px 10px' }}>{chalanData.secondApprovedBy}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, fontSize: 12 }}>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>Sender Signature</div>
                </div>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>Security Gate</div>
                </div>
                <div style={{ textAlign: 'center', width: '30%' }}>
                  <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>Receiver Signature</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal title="Transfer Details" open={!!detailModal} onCancel={() => setDetailModal(null)} footer={null} width={520}>
        {detailModal && (() => {
          const allSteps = detailModal.basis === 'loan'
            ? ['requested', 'first_approved', 'second_approved', 'dispatched', 'received', 'return_requested', 'return_approved']
            : ['requested', 'first_approved', 'second_approved', 'dispatched', 'received'];
          const stepLabels: Record<string, string> = { requested: 'Requested', first_approved: '1st Approved', second_approved: '2nd Approved', dispatched: 'Dispatched', received: 'Received', return_requested: 'Return Req.', return_approved: 'Returned' };
          const currentIdx = detailModal.status === 'rejected' ? -1 : allSteps.indexOf(detailModal.status);
          return (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
                {allSteps.map((step, i) => {
                  let color = 'default';
                  if (detailModal.status === 'rejected') color = 'default';
                  else if (i < currentIdx) color = 'green';
                  else if (i === currentIdx) color = 'blue';
                  return <Tag key={step} color={color} style={{ margin: 0, fontSize: 11 }}>{stepLabels[step]}</Tag>;
                })}
                {detailModal.status === 'rejected' && <Tag color="red" style={{ margin: 0, fontSize: 11 }}>Rejected</Tag>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                <div><span style={{ color: '#8c8c8c', fontSize: 11 }}>Machine</span><br /><strong style={{ fontFamily: 'monospace' }}>{detailModal.machine?.machineId}</strong></div>
                <div><span style={{ color: '#8c8c8c', fontSize: 11 }}>Status</span><br /><Tag color={statusColor[detailModal.status]}>{statusLabels[detailModal.status]}</Tag></div>
                <div><span style={{ color: '#8c8c8c', fontSize: 11 }}>From</span><br />{detailModal.fromFacility} / {detailModal.fromFloor}{detailModal.fromSection ? ` / ${detailModal.fromSection}` : ''}{detailModal.fromLine ? ` / L${detailModal.fromLine}` : ''}</div>
                <div><span style={{ color: '#8c8c8c', fontSize: 11 }}>To</span><br />{detailModal.toFacility} / {detailModal.toFloor}{detailModal.toSection ? ` / ${detailModal.toSection}` : ''}{detailModal.toLine ? ` / L${detailModal.toLine}` : ''}</div>
                <div><span style={{ color: '#8c8c8c', fontSize: 11 }}>Basis</span><br /><Tag color={detailModal.basis === 'permanent' ? 'purple' : detailModal.basis === 'internal' ? 'gold' : 'cyan'} style={{ margin: 0 }}>{detailModal.basis?.toUpperCase()}</Tag></div>
                {detailModal.basis === 'loan' && detailModal.expectedReturnDate && (
                  <div><span style={{ color: '#8c8c8c', fontSize: 11 }}>Expected Return</span><br />
                    {dayjs(detailModal.expectedReturnDate).format('DD MMM YYYY')}
                    {dayjs(detailModal.expectedReturnDate).isBefore(dayjs(), 'day') && ['received', 'return_requested'].includes(detailModal.status) && <Tag color="red" style={{ marginLeft: 6, fontSize: 10 }}>OVERDUE</Tag>}
                  </div>
                )}
                <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#8c8c8c', fontSize: 11 }}>Reason</span><br />{detailModal.reason}</div>
                {detailModal.rejectionReason && <div style={{ gridColumn: '1 / -1', padding: 8, background: '#fff2f0', borderRadius: 6, border: '1px solid #ffccc7' }}><span style={{ color: '#ff4d4f', fontSize: 11, fontWeight: 600 }}>Rejection Reason</span><br />{detailModal.rejectionReason}</div>}
                {detailModal.returnRequestedAt && <div><span style={{ color: '#8c8c8c', fontSize: 11 }}>Return Requested</span><br />{dayjs(detailModal.returnRequestedAt).format('DD MMM YY HH:mm')}</div>}
                {detailModal.returnApprovedAt && <div><span style={{ color: '#8c8c8c', fontSize: 11 }}>Return Approved</span><br />{dayjs(detailModal.returnApprovedAt).format('DD MMM YY HH:mm')}</div>}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
