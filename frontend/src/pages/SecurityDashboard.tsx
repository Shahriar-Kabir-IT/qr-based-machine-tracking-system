import { useEffect, useState } from 'react';
import { Table, Button, Tag, Typography, message, Card, Row, Col, Statistic, Tabs, Modal, Descriptions, Space, Badge } from 'antd';
import { InboxOutlined, ExportOutlined, FileTextOutlined, PrinterOutlined } from '@ant-design/icons';
import api from '../api/client';
import dayjs from 'dayjs';
import { getFullName } from '../utils/machineTypes';

const statusLabels: Record<string, string> = {
  approved: 'Awaiting Receive', received: 'Received — Awaiting Condition Check',
  condition_confirmed: 'Condition OK', in_use: 'In Use',
  return_approved: 'Awaiting Return Confirmation', returned: 'Returned',
};
const statusColor: Record<string, string> = {
  approved: 'orange', received: 'blue', condition_confirmed: 'cyan',
  in_use: 'green', return_approved: 'volcano', returned: 'default',
};

export default function SecurityDashboard() {
  const [rentals, setRentals] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [docModal, setDocModal] = useState<any>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/rental/security'),
      api.get('/rental/history'),
    ]).then(([secRes, histRes]) => {
      setRentals(secRes.data);
      setHistory(histRes.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleReceive = async (id: number) => {
    await api.put(`/rental/${id}/confirm-receipt`);
    message.success('Machine received — receiving document created');
    load();
  };

  const handleConfirmReturn = async (id: number) => {
    await api.put(`/rental/${id}/confirm-return`);
    message.success('Machine return confirmed — outing document created');
    load();
  };

  const printDoc = (rental: any, type: 'receiving' | 'outing') => {
    const isReceiving = type === 'receiving';
    const pw = window.open('', '_blank');
    if (!pw) return;
    pw.document.write(`<html><head><title>${isReceiving ? 'Receiving' : 'Outing'} Document - ${rental.machineType}</title>
<style>
body{font-family:Arial,sans-serif;padding:40px;max-width:750px;margin:0 auto}
h1{text-align:center;font-size:20px;border-bottom:2px solid #000;padding-bottom:8px}
.doc-no{text-align:center;font-size:14px;color:#555;margin-bottom:24px}
table{width:100%;border-collapse:collapse;margin:16px 0}
th,td{border:1px solid #ccc;padding:8px 12px;text-align:left;font-size:13px}
th{background:#f5f5f5;width:35%}
.section-title{background:#e8e8e8;font-weight:bold;text-align:center;font-size:13px}
.footer{margin-top:40px;display:flex;justify-content:space-between}
.sig{border-top:1px solid #000;width:200px;text-align:center;padding-top:4px;font-size:12px}
@media print{body{padding:20px}}
</style></head><body>
<h1>${isReceiving ? 'MACHINE RECEIVING DOCUMENT' : 'MACHINE OUTING DOCUMENT'}</h1>
<div class="doc-no">Doc No: <strong>${isReceiving ? rental.receivingDocNo : rental.outingDocNo}</strong></div>
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
<tr><td class="section-title" colspan="2">Request Details</td></tr>
<tr><th>Requested By</th><td>${rental.requestedByName || 'N/A'}</td></tr>
<tr><th>Requested At</th><td>${rental.requestedAt ? dayjs(rental.requestedAt).format('DD MMM YYYY HH:mm') : 'N/A'}</td></tr>
<tr><th>Justification</th><td>${rental.justification || 'N/A'}</td></tr>
<tr><th>Approved By</th><td>${rental.approvedByName || 'N/A'}</td></tr>
<tr><th>Approved At</th><td>${rental.approvedAt ? dayjs(rental.approvedAt).format('DD MMM YYYY HH:mm') : 'N/A'}</td></tr>
${rental.approvalJustification ? `<tr><th>Approval Note</th><td>${rental.approvalJustification}</td></tr>` : ''}
<tr><td class="section-title" colspan="2">${isReceiving ? 'Receiving Details' : 'Return Details'}</td></tr>
${isReceiving ? `<tr><th>Received By (Security)</th><td>${rental.receivedBySecurityName || 'N/A'}</td></tr>
<tr><th>Received At</th><td>${rental.receivedAt ? dayjs(rental.receivedAt).format('DD MMM YYYY HH:mm') : 'N/A'}</td></tr>`
: `<tr><th>Condition Confirmed By</th><td>${rental.conditionConfirmedByName || 'N/A'}</td></tr>
<tr><th>Condition Note</th><td>${rental.conditionNote || 'N/A'}</td></tr>
<tr><th>Return Approved By</th><td>${rental.returnApprovedByName || 'N/A'}</td></tr>
<tr><th>Return Approved At</th><td>${rental.returnApprovedAt ? dayjs(rental.returnApprovedAt).format('DD MMM YYYY HH:mm') : 'N/A'}</td></tr>
<tr><th>Returned By (Security)</th><td>${rental.returnConfirmedByName || 'N/A'}</td></tr>
<tr><th>Returned At</th><td>${rental.returnedAt ? dayjs(rental.returnedAt).format('DD MMM YYYY HH:mm') : 'N/A'}</td></tr>
<tr><th>Original Receiving Doc</th><td>${rental.receivingDocNo || 'N/A'}</td></tr>`}
</table>
<div class="footer">
<div class="sig">Security Officer</div>
<div class="sig">Authorized By</div>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
    pw.document.close();
  };

  const pendingReceive = rentals.filter((r) => r.status === 'approved');
  const activeInFactory = rentals.filter((r) => ['received', 'condition_confirmed', 'in_use'].includes(r.status));
  const pendingReturn = rentals.filter((r) => r.status === 'return_approved');

  const columns = [
    { title: 'Machine Type', dataIndex: 'machineType', key: 'type', render: (v: string) => getFullName(v) },
    { title: 'Model', dataIndex: 'model', key: 'model', render: (v: string) => v || '—' },
    { title: 'Serial No', dataIndex: 'serialNo', key: 'serial', render: (v: string) => v || '—' },
    { title: 'Factory', dataIndex: 'factory', key: 'factory', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={statusColor[s]}>{statusLabels[s]}</Tag> },
    { title: 'Date', dataIndex: 'requestedAt', key: 'date', render: (v: string) => <span style={{ fontSize: 12 }}>{dayjs(v).format('DD MMM YY')}</span> },
    {
      title: 'Actions', key: 'actions', width: 200,
      render: (_: any, r: any) => (
        <Space size={4} wrap>
          {r.status === 'approved' && (
            <Button size="small" type="primary" icon={<InboxOutlined />} onClick={() => handleReceive(r.id)}>Confirm Receive</Button>
          )}
          {r.status === 'return_approved' && (
            <Button size="small" type="primary" icon={<ExportOutlined />} onClick={() => handleConfirmReturn(r.id)}>Confirm Return</Button>
          )}
          {r.receivingDocNo && (
            <Button size="small" icon={<PrinterOutlined />} onClick={() => printDoc(r, 'receiving')}>RCV Doc</Button>
          )}
          {r.outingDocNo && (
            <Button size="small" icon={<PrinterOutlined />} onClick={() => printDoc(r, 'outing')}>OUT Doc</Button>
          )}
          <Button size="small" type="text" icon={<FileTextOutlined />} onClick={() => setDocModal(r)}>Details</Button>
        </Space>
      ),
    },
  ];

  const historyColumns = [
    { title: 'Machine Type', dataIndex: 'machineType', key: 'type', render: (v: string) => getFullName(v) },
    { title: 'Model', dataIndex: 'model', key: 'model', render: (v: string) => v || '—' },
    { title: 'Factory', dataIndex: 'factory', key: 'factory', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Receiving Doc', dataIndex: 'receivingDocNo', key: 'rcv', render: (v: string) => v || '—' },
    { title: 'Outing Doc', dataIndex: 'outingDocNo', key: 'out', render: (v: string) => v || '—' },
    { title: 'Received', dataIndex: 'receivedAt', key: 'rcvDate', render: (v: string) => v ? dayjs(v).format('DD MMM YY') : '—' },
    { title: 'Returned', dataIndex: 'returnedAt', key: 'retDate', render: (v: string) => v ? dayjs(v).format('DD MMM YY') : '—' },
    {
      title: '', key: 'actions', width: 150,
      render: (_: any, r: any) => (
        <Space size={4}>
          {r.receivingDocNo && <Button size="small" icon={<PrinterOutlined />} onClick={() => printDoc(r, 'receiving')}>RCV</Button>}
          {r.outingDocNo && <Button size="small" icon={<PrinterOutlined />} onClick={() => printDoc(r, 'outing')}>OUT</Button>}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <Typography.Title level={4}>Security Dashboard</Typography.Title>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={8}><Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #fa8c16' }}><Statistic title={<span style={{ fontSize: 11 }}>Pending Receive</span>} value={pendingReceive.length} valueStyle={{ color: '#fa8c16', fontSize: 20 }} /></Card></Col>
        <Col xs={8}><Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #52c41a' }}><Statistic title={<span style={{ fontSize: 11 }}>In Factory</span>} value={activeInFactory.length} valueStyle={{ color: '#52c41a', fontSize: 20 }} /></Card></Col>
        <Col xs={8}><Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #ff4d4f' }}><Statistic title={<span style={{ fontSize: 11 }}>Pending Return</span>} value={pendingReturn.length} valueStyle={{ color: '#ff4d4f', fontSize: 20 }} /></Card></Col>
      </Row>

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Tabs
          defaultActiveKey="active"
          style={{ padding: '0 12px' }}
          size="small"
          items={[
            {
              key: 'active',
              label: <span>Active <Badge count={rentals.length} style={{ backgroundColor: '#1677ff', marginLeft: 4 }} size="small" /></span>,
              children: <Table dataSource={rentals} columns={columns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20, size: 'small' }} scroll={{ x: 800 }} />,
            },
            {
              key: 'history',
              label: <span>History <Badge count={history.length} style={{ backgroundColor: '#8c8c8c', marginLeft: 4 }} size="small" /></span>,
              children: <Table dataSource={history} columns={historyColumns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20, size: 'small' }} scroll={{ x: 700 }} />,
            },
          ]}
        />
      </Card>

      <Modal title="Rental Details" open={!!docModal} onCancel={() => setDocModal(null)} footer={null} width={640}>
        {docModal && (
          <Descriptions column={1} size="small" bordered labelStyle={{ width: 160, whiteSpace: 'nowrap' }}>
            <Descriptions.Item label="Machine Type">{getFullName(docModal.machineType)}</Descriptions.Item>
            <Descriptions.Item label="Model">{docModal.model || '—'}</Descriptions.Item>
            <Descriptions.Item label="Serial No">{docModal.serialNo || '—'}</Descriptions.Item>
            <Descriptions.Item label="Supplier">{docModal.supplier || '—'}</Descriptions.Item>
            <Descriptions.Item label="Factory">{docModal.factory || '—'}</Descriptions.Item>
            <Descriptions.Item label="Floor / Section / Line">{`${docModal.floor || '—'} / ${docModal.section || '—'} / ${docModal.line || '—'}`}</Descriptions.Item>
            <Descriptions.Item label="Est. Days">{docModal.estimatedDays || 0}</Descriptions.Item>
            <Descriptions.Item label="Justification">{docModal.justification}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={statusColor[docModal.status]}>{statusLabels[docModal.status]}</Tag></Descriptions.Item>
            <Descriptions.Item label="Requested By">{docModal.requestedByName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Requested At">{docModal.requestedAt ? dayjs(docModal.requestedAt).format('DD MMM YYYY HH:mm') : '—'}</Descriptions.Item>
            <Descriptions.Item label="Approved By">{docModal.approvedByName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Approved At">{docModal.approvedAt ? dayjs(docModal.approvedAt).format('DD MMM YYYY HH:mm') : '—'}</Descriptions.Item>
            {docModal.approvalJustification && <Descriptions.Item label="Approval Note">{docModal.approvalJustification}</Descriptions.Item>}
            {docModal.receivingDocNo && <Descriptions.Item label="Receiving Doc">{docModal.receivingDocNo}</Descriptions.Item>}
            {docModal.receivedBySecurityName && <Descriptions.Item label="Received By">{docModal.receivedBySecurityName}</Descriptions.Item>}
            {docModal.receivedAt && <Descriptions.Item label="Received At">{dayjs(docModal.receivedAt).format('DD MMM YYYY HH:mm')}</Descriptions.Item>}
            {docModal.conditionConfirmedByName && <Descriptions.Item label="Condition By">{docModal.conditionConfirmedByName}</Descriptions.Item>}
            {docModal.conditionNote && <Descriptions.Item label="Condition Note">{docModal.conditionNote}</Descriptions.Item>}
            {docModal.returnApprovedByName && <Descriptions.Item label="Return Approved By">{docModal.returnApprovedByName}</Descriptions.Item>}
            {docModal.outingDocNo && <Descriptions.Item label="Outing Doc">{docModal.outingDocNo}</Descriptions.Item>}
            {docModal.returnConfirmedByName && <Descriptions.Item label="Return Confirmed By">{docModal.returnConfirmedByName}</Descriptions.Item>}
            {docModal.returnedAt && <Descriptions.Item label="Returned At">{dayjs(docModal.returnedAt).format('DD MMM YYYY HH:mm')}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
