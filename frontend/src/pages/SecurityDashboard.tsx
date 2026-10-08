import { useEffect, useState } from 'react';
import { Table, Button, Tag, Typography, message, Card, Row, Col, Statistic, Tabs, Modal, Descriptions, Space, Badge } from 'antd';
import { InboxOutlined, ExportOutlined, FileTextOutlined, PrinterOutlined, SwapOutlined } from '@ant-design/icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import { getFullName } from '../utils/machineTypes';

const facilityNames: Record<string, string> = {
  AGL: 'Ananta Garments Ltd.',
  AJL: 'Ananta Jeanswear Ltd.',
  ABM: 'ABM Fashion Ltd.',
  ASL: 'Ananta Sportswear Ltd.',
};

const rentalStatusLabels: Record<string, string> = {
  approved: 'Awaiting Receive', received: 'Received — Awaiting Condition Check',
  condition_confirmed: 'Condition OK', in_use: 'In Use',
  return_first_approved: 'Return — Pending Admin Approval', return_second_approved: 'Awaiting Return Dispatch',
  return_approved: 'Awaiting Return Dispatch', returned: 'Returned',
};
const rentalStatusColor: Record<string, string> = {
  approved: 'orange', received: 'blue', condition_confirmed: 'cyan',
  in_use: 'green', return_first_approved: 'gold', return_second_approved: 'lime',
  return_approved: 'volcano', returned: 'default',
};

const transferStatusLabels: Record<string, string> = {
  second_approved: 'Pending Dispatch',
  dispatched: 'Pending Receive',
  return_second_approved: 'Return — Pending Dispatch',
  return_dispatched: 'Return — Pending Receive',
  received: 'Received',
  completed: 'Completed',
  returned: 'Returned',
  rejected: 'Rejected',
};
const transferStatusColor: Record<string, string> = {
  second_approved: 'orange',
  dispatched: 'blue',
  return_second_approved: 'gold',
  return_dispatched: 'volcano',
  received: 'green',
  completed: 'green',
  returned: 'green',
  rejected: 'red',
};

export default function SecurityDashboard() {
  const [rentals, setRentals] = useState<any[]>([]);
  const [rentalHistory, setRentalHistory] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [transferHistory, setTransferHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [docModal, setDocModal] = useState<any>(null);
  const [chalanData, setChalanData] = useState<any>(null);
  const [rejectModal, setRejectModal] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { user } = useAuth();
  const signatureUrl = `${window.location.origin}/signature-hod.jpeg`;

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/rental/security'),
      api.get('/rental/history'),
      api.get('/transfers/security'),
      api.get('/transfers/security/history'),
    ]).then(([secRes, histRes, tSecRes, tHistRes]) => {
      setRentals(secRes.data);
      setRentalHistory(histRes.data);
      setTransfers(tSecRes.data);
      setTransferHistory(tHistRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
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

  const handleTransferAction = async (id: number, action: string, label: string) => {
    await api.put(`/transfers/${id}/${action}`);
    message.success(`Transfer ${label}`);
    load();
  };

  const handleTransferReject = async () => {
    if (!rejectModal || !rejectReason.trim()) { message.error('Reason is required'); return; }
    await api.put(`/transfers/${rejectModal}/reject`, { reason: rejectReason });
    message.success('Transfer rejected');
    setRejectModal(null);
    setRejectReason('');
    load();
  };

  const openTransferChalan = async (id: number, isReturn = false) => {
    const endpoint = isReturn ? `/transfers/${id}/return-chalan` : `/transfers/${id}/chalan`;
    const res = await api.get(endpoint);
    if (res.data.error) { message.error(res.data.error); return; }
    setChalanData({ ...res.data, isReturn });
  };

  const printTransferChalan = () => {
    if (!chalanData) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    const companyName = facilityNames[chalanData.from.facility] || chalanData.from.facility;
    const fmt = (d: string) => d ? dayjs(d).format('DD MMM YYYY') : 'N/A';
    win.document.write(`<!DOCTYPE html><html><head><title>Chalan ${chalanData.chalanNo}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;padding:20px}
table{width:100%;border-collapse:collapse;margin:12px 0}
th,td{border:1px solid #333;padding:6px 10px;text-align:left;font-size:12px}
th{background:#f0f0f0;font-weight:600}
.sig{width:30%;text-align:center;font-size:11px}
.sig-line{border-top:1px solid #000;margin-top:50px;padding-top:4px}
@media print{body{padding:10px}}
</style></head><body>
<div style="text-align:center;margin-bottom:16px">
<h2 style="margin:0;font-size:20px">${companyName}</h2>
<h3 style="margin:4px 0;font-size:16px">${chalanData.isReturn ? 'Machine Return Chalan' : 'Machine Transfer Chalan'}</h3>
<div style="font-size:12px;color:#555">Delivery Note / Gate Pass</div>
</div>
<div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:13px">
<div><strong>Chalan No:</strong> ${chalanData.chalanNo}</div>
<div><strong>Date:</strong> ${fmt(chalanData.date)}</div>
<div><strong>Type:</strong> ${chalanData.basis?.toUpperCase()}${chalanData.isReturn ? ' (RETURN)' : ''}</div>
</div>
<table>
<tr><th colspan="2" style="text-align:center;background:#e0e0e0">Machine Details</th></tr>
<tr><td style="width:160px;font-weight:600">Machine ID</td><td>${chalanData.machine?.machineId || 'N/A'}</td></tr>
<tr><td style="font-weight:600">Machine Type</td><td>${chalanData.machine?.machineType || 'N/A'}</td></tr>
<tr><td style="font-weight:600">Brand</td><td>${chalanData.machine?.brand || 'N/A'}</td></tr>
<tr><td style="font-weight:600">Model No</td><td>${chalanData.machine?.modelNo || 'N/A'}</td></tr>
<tr><td style="font-weight:600">Serial No</td><td>${chalanData.machine?.mfgSerialNo || 'N/A'}</td></tr>
</table>
<table>
<tr><th>Transfer From</th><th>Transfer To</th></tr>
<tr>
<td><strong>Factory:</strong> ${chalanData.from.facility}<br><strong>Floor:</strong> ${chalanData.from.floor}${chalanData.from.section ? '<br><strong>Section:</strong> ' + chalanData.from.section : ''}${chalanData.from.line ? '<br><strong>Line:</strong> ' + chalanData.from.line : ''}</td>
<td><strong>Factory:</strong> ${chalanData.to.facility}<br><strong>Floor:</strong> ${chalanData.to.floor}${chalanData.to.section ? '<br><strong>Section:</strong> ' + chalanData.to.section : ''}${chalanData.to.line ? '<br><strong>Line:</strong> ' + chalanData.to.line : ''}</td>
</tr>
</table>
<div style="font-size:13px;margin:12px 0"><strong>Reason:</strong> ${chalanData.reason || 'N/A'}</div>
${chalanData.basis === 'loan' && chalanData.expectedReturnDate ? '<div style="font-size:13px;margin:8px 0;padding:8px;background:#fffbe6;border:1px solid #ffe58f"><strong>Expected Return Date:</strong> ' + fmt(chalanData.expectedReturnDate) + '</div>' : ''}
<table>
<tr>${!chalanData.isReturn ? '<th>Requested By</th>' : ''}<th>1st Approved By (HoD)</th><th>2nd Approved By (Admin)</th></tr>
<tr>${!chalanData.isReturn ? '<td>' + (chalanData.requestedBy || 'N/A') + '</td>' : ''}
<td>${chalanData.firstApprovedBy || 'N/A'}<br><img src="${signatureUrl}" style="height:80px;margin-top:4px;object-fit:contain" /></td>
<td>${chalanData.secondApprovedBy || 'N/A'}</td></tr>
</table>
<div style="display:flex;justify-content:space-between;margin-top:40px">
<div class="sig"><div class="sig-line">Sender Signature</div></div>
<div class="sig"><div class="sig-line">Security Gate</div></div>
<div class="sig"><div class="sig-line">Receiver Signature</div></div>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
    win.document.close();
  };

  const printRentalChalan = (rental: any, type: 'receiving' | 'outing') => {
    const isReceiving = type === 'receiving';
    const pw = window.open('', '_blank');
    if (!pw) return;
    const docNo = isReceiving ? rental.receivingDocNo : rental.outingDocNo;
    const companyName = facilityNames[rental.factory] || rental.factory || 'Ananta Group';
    const fmt = (d: string) => d ? dayjs(d).format('DD MMM YYYY HH:mm') : 'N/A';
    const dateStr = isReceiving ? fmt(rental.receivedAt) : fmt(rental.returnedAt);
    pw.document.write(`<html><head><title>${isReceiving ? 'Receiving' : 'Outing'} Chalan - ${docNo}</title>
<style>
body{font-family:Arial,sans-serif;padding:30px;max-width:750px;margin:0 auto}
.header{text-align:center;margin-bottom:20px}
.company{font-size:22px;font-weight:bold;margin-bottom:2px}
.doc-title{font-size:16px;font-weight:bold;border:2px solid #000;display:inline-block;padding:4px 20px;margin:8px 0}
.meta{display:flex;justify-content:space-between;margin:12px 0;font-size:13px}
table{width:100%;border-collapse:collapse;margin:12px 0}
th,td{border:1px solid #333;padding:7px 10px;text-align:left;font-size:12px}
th{background:#f0f0f0;font-weight:600}
.section-title{background:#e0e0e0;font-weight:bold;text-align:center;font-size:12px}
.footer{margin-top:40px;display:flex;justify-content:space-between}
.sig{width:160px;text-align:center;font-size:11px}
.sig-line{border-top:1px solid #000;margin-top:50px;padding-top:4px}
@media print{body{padding:15px}}
</style></head><body>
<div class="header">
<div class="company">${companyName}</div>
<div style="font-size:12px;color:#555">Machine Tracking System</div>
<div class="doc-title">${isReceiving ? 'MACHINE RECEIVING CHALAN' : 'MACHINE OUTING CHALAN'}</div>
</div>
<div class="meta">
<div><strong>Chalan No:</strong> ${docNo || 'N/A'}</div>
<div><strong>Date:</strong> ${dateStr}</div>
<div><strong>Type:</strong> ${isReceiving ? 'Rental Receive' : 'Rental Return'}</div>
</div>
<table>
<tr><td class="section-title" colspan="4">Machine Details</td></tr>
<tr><th>Machine Type</th><td>${getFullName(rental.machineType)}</td><th>Model</th><td>${rental.model || 'N/A'}</td></tr>
<tr><th>Serial No</th><td>${rental.serialNo || 'N/A'}</td><th>Supplier</th><td>${rental.supplier || 'N/A'}</td></tr>
<tr><td class="section-title" colspan="4">Location & Duration</td></tr>
<tr><th>Factory</th><td>${rental.factory || 'N/A'}</td><th>Floor</th><td>${rental.floor || 'N/A'}</td></tr>
<tr><th>Section</th><td>${rental.section || 'N/A'}</td><th>Line</th><td>${rental.line || 'N/A'}</td></tr>
<tr><th>Estimated Duration</th><td>${rental.estimatedDays || 0} days</td><th>Justification</th><td>${rental.justification || 'N/A'}</td></tr>
<tr><td class="section-title" colspan="4">Approval Details</td></tr>
<tr><th>Requested By</th><td>${rental.requestedByName || 'N/A'}</td><th>Requested At</th><td>${fmt(rental.requestedAt)}</td></tr>
<tr><th>Approved By</th><td>${rental.approvedByName || 'N/A'}</td><th>Approved At</th><td>${fmt(rental.approvedAt)}</td></tr>
${rental.approvalJustification ? `<tr><th>Approval Note</th><td colspan="3">${rental.approvalJustification}</td></tr>` : ''}
${isReceiving ? `
<tr><td class="section-title" colspan="4">Receiving Details</td></tr>
<tr><th>Receiving Chalan No</th><td>${rental.receivingDocNo || 'N/A'}</td><th>Security Officer</th><td>${rental.receivedBySecurityName || 'N/A'}</td></tr>
<tr><th>Received At</th><td colspan="3">${fmt(rental.receivedAt)}</td></tr>
` : `
<tr><td class="section-title" colspan="4">Return Details</td></tr>
<tr><th>Receiving Chalan No</th><td>${rental.receivingDocNo || 'N/A'}</td><th>Outing Chalan No</th><td>${rental.outingDocNo || 'N/A'}</td></tr>
<tr><th>Return Requested By</th><td>${rental.returnRequestedByName || 'N/A'}</td><th>Return Approved By</th><td>${rental.returnApprovedByName || 'N/A'}</td></tr>
<tr><th>Condition Note</th><td>${rental.conditionNote || 'N/A'}</td><th>Condition By</th><td>${rental.conditionConfirmedByName || 'N/A'}</td></tr>
<tr><th>Security Officer</th><td>${rental.returnConfirmedByName || 'N/A'}</td><th>Returned At</th><td>${fmt(rental.returnedAt)}</td></tr>
`}
</table>
<div class="footer">
<div class="sig"><div class="sig-line">Requested By</div></div>
<div class="sig"><div class="sig-line">Approved By (HoD)</div></div>
<div class="sig"><div class="sig-line">Security Gate</div></div>
<div class="sig"><div class="sig-line">${isReceiving ? 'Received By' : 'Returned By'}</div></div>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`);
    pw.document.close();
  };

  const pendingReceive = rentals.filter((r) => r.status === 'approved');
  const activeInFactory = rentals.filter((r) => ['received', 'condition_confirmed', 'in_use'].includes(r.status));
  const pendingReturn = rentals.filter((r) => ['return_second_approved', 'return_approved'].includes(r.status));

  const pendingDispatch = transfers.filter((t) => t.status === 'second_approved');
  const pendingTransferReceive = transfers.filter((t) => t.status === 'dispatched');
  const pendingReturnDispatch = transfers.filter((t) => t.status === 'return_second_approved');
  const pendingReturnReceive = transfers.filter((t) => t.status === 'return_dispatched');

  const rentalColumns = [
    { title: 'Machine Type', dataIndex: 'machineType', key: 'type', render: (v: string) => getFullName(v) },
    { title: 'Model', dataIndex: 'model', key: 'model', render: (v: string) => v || '—' },
    { title: 'Serial No', dataIndex: 'serialNo', key: 'serial', render: (v: string) => v || '—' },
    { title: 'Factory', dataIndex: 'factory', key: 'factory', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={rentalStatusColor[s]}>{rentalStatusLabels[s]}</Tag> },
    { title: 'Date', dataIndex: 'requestedAt', key: 'date', render: (v: string) => <span style={{ fontSize: 12 }}>{dayjs(v).format('DD MMM YY')}</span> },
    {
      title: 'Actions', key: 'actions', width: 200,
      render: (_: any, r: any) => (
        <Space size={4} wrap>
          {r.status === 'approved' && (
            <Button size="small" type="primary" icon={<InboxOutlined />} onClick={() => handleReceive(r.id)}>Confirm Receive</Button>
          )}
          {['return_second_approved', 'return_approved'].includes(r.status) && (
            <Button size="small" type="primary" icon={<ExportOutlined />} onClick={() => handleConfirmReturn(r.id)}>Confirm Return</Button>
          )}
          {r.receivingDocNo && (
            <Button size="small" icon={<PrinterOutlined />} onClick={() => printRentalChalan(r, 'receiving')}>RCV Doc</Button>
          )}
          {r.outingDocNo && (
            <Button size="small" icon={<PrinterOutlined />} onClick={() => printRentalChalan(r, 'outing')}>OUT Doc</Button>
          )}
          <Button size="small" type="text" icon={<FileTextOutlined />} onClick={() => setDocModal(r)}>Details</Button>
        </Space>
      ),
    },
  ];

  const rentalHistoryColumns = [
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
          {r.receivingDocNo && <Button size="small" icon={<PrinterOutlined />} onClick={() => printRentalChalan(r, 'receiving')}>RCV</Button>}
          {r.outingDocNo && <Button size="small" icon={<PrinterOutlined />} onClick={() => printRentalChalan(r, 'outing')}>OUT</Button>}
        </Space>
      ),
    },
  ];

  const transferColumns = [
    { title: 'Machine', key: 'machine', render: (_: any, r: any) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.machine?.machineId || 'N/A'}</span> },
    { title: 'From', key: 'from', render: (_: any, r: any) => `${r.fromFacility} / ${r.fromFloor}` },
    { title: 'To', key: 'to', render: (_: any, r: any) => `${r.toFacility} / ${r.toFloor}` },
    {
      title: 'Basis', dataIndex: 'basis', key: 'basis',
      render: (v: string) => <Tag color={v === 'permanent' ? 'purple' : v === 'loan' ? 'cyan' : 'gold'}>{v?.toUpperCase()}</Tag>,
    },
    { title: 'Chalan', dataIndex: 'chalanNo', key: 'chalan', render: (v: string) => v || '—' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={transferStatusColor[s]}>{transferStatusLabels[s] || s}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 280,
      render: (_: any, r: any) => (
        <Space size={4} wrap>
          {r.status === 'second_approved' && (
            <Button size="small" type="primary" icon={<ExportOutlined />} onClick={() => handleTransferAction(r.id, 'dispatch', 'dispatched')}>Dispatch</Button>
          )}
          {r.status === 'dispatched' && r.dispatchedBy !== user?.id && (
            <>
              <Button size="small" type="primary" icon={<InboxOutlined />} onClick={() => handleTransferAction(r.id, 'receive', 'received')}>Receive</Button>
              <Button size="small" danger onClick={() => setRejectModal(r.id)}>Reject</Button>
            </>
          )}
          {r.status === 'dispatched' && r.dispatchedBy === user?.id && (
            <Tag color="processing">Awaiting destination</Tag>
          )}
          {r.status === 'return_second_approved' && (
            <Button size="small" type="primary" style={{ background: '#722ed1', borderColor: '#722ed1' }} icon={<ExportOutlined />} onClick={() => handleTransferAction(r.id, 'dispatch-return', 'return dispatched')}>Dispatch Return</Button>
          )}
          {r.status === 'return_dispatched' && r.returnDispatchedBy !== user?.id && (
            <Button size="small" type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }} icon={<InboxOutlined />} onClick={() => handleTransferAction(r.id, 'receive-return', 'return received')}>Receive Return</Button>
          )}
          {r.status === 'return_dispatched' && r.returnDispatchedBy === user?.id && (
            <Tag color="processing">Awaiting origin</Tag>
          )}
          {r.chalanNo && (
            <Button size="small" icon={<PrinterOutlined />} onClick={() => openTransferChalan(r.id)}>Chalan</Button>
          )}
          {r.returnChalanNo && (
            <Button size="small" icon={<PrinterOutlined />} onClick={() => openTransferChalan(r.id, true)}>Ret. Chalan</Button>
          )}
        </Space>
      ),
    },
  ];

  const transferHistoryColumns = [
    { title: 'Machine', key: 'machine', render: (_: any, r: any) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.machine?.machineId || 'N/A'}</span> },
    { title: 'From', key: 'from', render: (_: any, r: any) => `${r.fromFacility} / ${r.fromFloor}` },
    { title: 'To', key: 'to', render: (_: any, r: any) => `${r.toFacility} / ${r.toFloor}` },
    { title: 'Basis', dataIndex: 'basis', key: 'basis', render: (v: string) => <Tag color={v === 'permanent' ? 'purple' : v === 'loan' ? 'cyan' : 'gold'}>{v?.toUpperCase()}</Tag> },
    { title: 'Chalan', dataIndex: 'chalanNo', key: 'chalan', render: (v: string) => v || '—' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={transferStatusColor[s]}>{transferStatusLabels[s] || s}</Tag> },
    {
      title: '', key: 'actions', width: 150,
      render: (_: any, r: any) => (
        <Space size={4}>
          {r.chalanNo && <Button size="small" icon={<PrinterOutlined />} onClick={() => openTransferChalan(r.id)}>Chalan</Button>}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <Typography.Title level={4}>Security Dashboard</Typography.Title>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={6}><Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #fa8c16' }}><Statistic title={<span style={{ fontSize: 11 }}>Rental — Pending Receive</span>} value={pendingReceive.length} valueStyle={{ color: '#fa8c16', fontSize: 20 }} /></Card></Col>
        <Col xs={6}><Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #52c41a' }}><Statistic title={<span style={{ fontSize: 11 }}>Rental — In Factory</span>} value={activeInFactory.length} valueStyle={{ color: '#52c41a', fontSize: 20 }} /></Card></Col>
        <Col xs={6}><Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #1677ff' }}><Statistic title={<span style={{ fontSize: 11 }}>Transfer — Pending</span>} value={pendingDispatch.length + pendingTransferReceive.length} valueStyle={{ color: '#1677ff', fontSize: 20 }} /></Card></Col>
        <Col xs={6}><Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #722ed1' }}><Statistic title={<span style={{ fontSize: 11 }}>Return — Pending</span>} value={pendingReturn.length + pendingReturnDispatch.length + pendingReturnReceive.length} valueStyle={{ color: '#722ed1', fontSize: 20 }} /></Card></Col>
      </Row>

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Tabs
          defaultActiveKey="transfers"
          style={{ padding: '0 12px' }}
          size="small"
          items={[
            {
              key: 'transfers',
              label: <span><SwapOutlined /> Transfers <Badge count={transfers.length} style={{ backgroundColor: '#1677ff', marginLeft: 4 }} size="small" /></span>,
              children: <Table dataSource={transfers} columns={transferColumns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20, size: 'small' }} scroll={{ x: 800 }} />,
            },
            {
              key: 'rentals',
              label: <span><InboxOutlined /> Rentals <Badge count={rentals.length} style={{ backgroundColor: '#fa8c16', marginLeft: 4 }} size="small" /></span>,
              children: <Table dataSource={rentals} columns={rentalColumns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20, size: 'small' }} scroll={{ x: 800 }} />,
            },
            {
              key: 'transfer-history',
              label: <span>Transfer History <Badge count={transferHistory.length} style={{ backgroundColor: '#8c8c8c', marginLeft: 4 }} size="small" /></span>,
              children: <Table dataSource={transferHistory} columns={transferHistoryColumns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20, size: 'small' }} scroll={{ x: 700 }} />,
            },
            {
              key: 'rental-history',
              label: <span>Rental History <Badge count={rentalHistory.length} style={{ backgroundColor: '#8c8c8c', marginLeft: 4 }} size="small" /></span>,
              children: <Table dataSource={rentalHistory} columns={rentalHistoryColumns} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20, size: 'small' }} scroll={{ x: 700 }} />,
            },
          ]}
        />
      </Card>

      {/* Transfer Chalan Modal */}
      <Modal title={`${chalanData?.isReturn ? 'Return ' : ''}Chalan — ${chalanData?.chalanNo || ''}`} open={!!chalanData} onCancel={() => setChalanData(null)} width={700}
        footer={<Button type="primary" icon={<PrinterOutlined />} onClick={printTransferChalan}>Print Chalan</Button>}>
        {chalanData && (
          <div>
            <div style={{ border: '2px solid #000', padding: 24 }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{facilityNames[chalanData.from.facility] || chalanData.from.facility}</h2>
                <h3 style={{ margin: '4px 0', fontSize: 16 }}>{chalanData.isReturn ? 'Machine Return Chalan' : 'Machine Transfer Chalan'}</h3>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13 }}>
                <div><strong>Chalan No:</strong> {chalanData.chalanNo}</div>
                <div><strong>Date:</strong> {dayjs(chalanData.date).format('DD MMM YYYY')}</div>
                <div><strong>Type:</strong> {chalanData.basis?.toUpperCase()}{chalanData.isReturn ? ' (RETURN)' : ''}</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 13 }}>
                <tbody>
                  {[['Machine ID', chalanData.machine?.machineId], ['Type', chalanData.machine?.machineType], ['Brand', chalanData.machine?.brand || 'N/A'], ['Model', chalanData.machine?.modelNo || 'N/A'], ['Serial', chalanData.machine?.mfgSerialNo || 'N/A']].map(([l, v]) => (
                    <tr key={l as string}><td style={{ border: '1px solid #000', padding: '4px 10px', width: 140, fontWeight: 600 }}>{l}</td><td style={{ border: '1px solid #000', padding: '4px 10px' }}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 13 }}>
                <thead><tr style={{ background: '#f0f0f0' }}><th style={{ border: '1px solid #000', padding: '6px 10px' }}>From</th><th style={{ border: '1px solid #000', padding: '6px 10px' }}>To</th></tr></thead>
                <tbody><tr>
                  <td style={{ border: '1px solid #000', padding: '6px 10px' }}>{chalanData.from.facility} / {chalanData.from.floor}{chalanData.from.section ? ' / ' + chalanData.from.section : ''}</td>
                  <td style={{ border: '1px solid #000', padding: '6px 10px' }}>{chalanData.to.facility} / {chalanData.to.floor}{chalanData.to.section ? ' / ' + chalanData.to.section : ''}</td>
                </tr></tbody>
              </table>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
                <thead><tr style={{ background: '#f0f0f0' }}>
                  {!chalanData.isReturn && <th style={{ border: '1px solid #000', padding: '6px 10px' }}>Requested By</th>}
                  <th style={{ border: '1px solid #000', padding: '6px 10px' }}>1st Approved By (HoD)</th>
                  <th style={{ border: '1px solid #000', padding: '6px 10px' }}>2nd Approved By (Admin)</th>
                </tr></thead>
                <tbody><tr>
                  {!chalanData.isReturn && <td style={{ border: '1px solid #000', padding: '6px 10px' }}>{chalanData.requestedBy}</td>}
                  <td style={{ border: '1px solid #000', padding: '6px 10px' }}>
                    <div>{chalanData.firstApprovedBy}</div>
                    <img src={signatureUrl} alt="HoD Signature" style={{ height: 80, marginTop: 4, objectFit: 'contain' }} />
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px 10px' }}>{chalanData.secondApprovedBy}</td>
                </tr></tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Transfer Reject Modal */}
      <Modal title="Reject Transfer" open={rejectModal !== null} onCancel={() => { setRejectModal(null); setRejectReason(''); }}
        onOk={handleTransferReject} okText="Reject" okButtonProps={{ danger: true }}>
        <div style={{ marginBottom: 8 }}>Rejection Reason:</div>
        <input
          style={{ width: '100%', padding: 8, border: '1px solid #d9d9d9', borderRadius: 6 }}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Enter reason for rejection"
        />
      </Modal>

      {/* Rental Details Modal */}
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
            <Descriptions.Item label="Status"><Tag color={rentalStatusColor[docModal.status]}>{rentalStatusLabels[docModal.status]}</Tag></Descriptions.Item>
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
