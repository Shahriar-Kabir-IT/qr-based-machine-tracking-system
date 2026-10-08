import { useEffect, useState, useRef } from 'react';
import { Card, Button, Tag, Typography, Modal, Empty, Badge, message, Row, Col, Statistic, Descriptions, Input, Tabs, Table } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, PrinterOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '../api/client';
import dayjs from 'dayjs';

export default function TechManagerDashboard() {
  const [pending, setPending] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [printData, setPrintData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const loadPending = () => {
    setLoading(true);
    api.get('/spare-parts/pending').then((res) => { setPending(res.data); setLoading(false); });
  };

  const loadAll = () => {
    api.get('/spare-parts').then((res) => setAllRequests(res.data));
  };

  useEffect(() => { loadPending(); loadAll(); }, []);

  const handleApprove = async (id: number) => {
    await api.put(`/spare-parts/${id}/approve`);
    message.success('অনুমোদিত হয়েছে');
    const approved = pending.find(r => r.id === id);
    if (approved) {
      const fresh = await api.get(`/spare-parts/${id}`);
      setPrintData(fresh.data);
    }
    loadPending();
    loadAll();
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    await api.put(`/spare-parts/${rejectModal}/reject`, { reason: rejectReason });
    message.success('প্রত্যাখ্যাত হয়েছে');
    setRejectModal(null);
    setRejectReason('');
    loadPending();
    loadAll();
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>স্টোর খরচপত্র</title><style>
      @media print { body { margin: 0; } }
      body { font-family: 'SolaimanLipi', 'Noto Sans Bengali', sans-serif; padding: 20px; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th, td { border: 1px solid #333; padding: 8px 12px; text-align: left; }
      th { background: #f0f0f0; }
      .header { text-align: center; margin-bottom: 16px; }
      .header h2 { margin: 4px 0; }
      .header p { margin: 2px 0; color: #555; }
      .sig-row { display: flex; justify-content: space-between; margin-top: 60px; }
      .sig-box { text-align: center; width: 30%; }
      .sig-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; }
    </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  const historyColumns = [
    { title: 'তারিখ', dataIndex: 'requestedAt', key: 'date', width: 120, render: (v: string) => dayjs(v).format('DD/MM/YY') },
    { title: 'মেশিন', dataIndex: ['machine', 'machineId'], key: 'machine', width: 120 },
    { title: 'যন্ত্রাংশ', dataIndex: 'part', key: 'part', ellipsis: true },
    { title: 'পরিমাণ', key: 'qty', width: 80, render: (_: any, r: any) => `${r.qty} ${r.unit || 'পিস'}` },
    { title: 'অনুরোধকারী', dataIndex: 'requestedBy', key: 'by', width: 120, ellipsis: true },
    { title: 'লাইন', dataIndex: 'line', key: 'line', width: 60 },
    {
      title: 'স্ট্যাটাস', dataIndex: 'status', key: 'status', width: 100,
      render: (s: string) => {
        const map: Record<string, { color: string; label: string }> = {
          pending: { color: 'orange', label: 'অপেক্ষমান' },
          approved: { color: 'green', label: 'অনুমোদিত' },
          rejected: { color: 'red', label: 'প্রত্যাখ্যাত' },
          store_issued: { color: 'blue', label: 'স্টোর ইস্যু' },
          installed: { color: 'purple', label: 'ইনস্টল' },
        };
        const info = map[s] || { color: 'default', label: s };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <Typography.Title level={4} style={{ margin: '0 0 16px' }}>
        <ClockCircleOutlined style={{ marginRight: 8 }} />
        যন্ত্রাংশ অনুমোদন
        {pending.length > 0 && <Badge count={pending.length} style={{ marginLeft: 12 }} />}
      </Typography.Title>

      <Tabs
        defaultActiveKey="pending"
        items={[
          {
            key: 'pending',
            label: <span>অপেক্ষমান অনুরোধ <Badge count={pending.length} size="small" style={{ marginLeft: 6 }} /></span>,
            children: (
              <>
                <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                  <Col xs={12} sm={8}>
                    <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #fa8c16' }}>
                      <Statistic title={<span style={{ fontSize: 11 }}>অপেক্ষমান</span>} value={pending.length} valueStyle={{ color: '#fa8c16', fontSize: 20 }} />
                    </Card>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #52c41a' }}>
                      <Statistic title={<span style={{ fontSize: 11 }}>অনুমোদিত</span>} value={allRequests.filter(r => r.status === 'approved').length} valueStyle={{ color: '#52c41a', fontSize: 20 }} />
                    </Card>
                  </Col>
                  <Col xs={0} sm={8}>
                    <Card size="small" styles={{ body: { padding: '8px 12px' } }} style={{ borderLeft: '3px solid #f5222d' }}>
                      <Statistic title={<span style={{ fontSize: 11 }}>প্রত্যাখ্যাত</span>} value={allRequests.filter(r => r.status === 'rejected').length} valueStyle={{ color: '#f5222d', fontSize: 20 }} />
                    </Card>
                  </Col>
                </Row>

                {pending.length === 0 && !loading && <Empty description="কোনো অপেক্ষমান অনুরোধ নেই" />}

                {pending.map((r) => (
                  <Card key={r.id} size="small" style={{ marginBottom: 10, borderLeft: '4px solid #fa8c16' }}>
                    <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
                      <Descriptions.Item label="মেশিন নং"><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.machine?.machineId || r.machineType}</span></Descriptions.Item>
                      <Descriptions.Item label="মেশিন টাইপ">{r.machineType}</Descriptions.Item>
                      <Descriptions.Item label="যন্ত্রাংশ"><strong>{r.part}</strong></Descriptions.Item>
                      <Descriptions.Item label="পরিমাণ">{r.qty} {r.unit || 'পিস'}</Descriptions.Item>
                      <Descriptions.Item label="কারখানা">{r.facility || '—'}</Descriptions.Item>
                      <Descriptions.Item label="লাইন">{r.line || '—'} / {r.floor || '—'}</Descriptions.Item>
                      <Descriptions.Item label="অনুরোধকারী">{r.requestedBy}</Descriptions.Item>
                      <Descriptions.Item label="তারিখ">{dayjs(r.requestedAt).format('DD/MM/YYYY hh:mm A')}</Descriptions.Item>
                      {r.reason && <Descriptions.Item label="কারণ" span={2}>{r.reason}</Descriptions.Item>}
                    </Descriptions>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Button danger icon={<CloseCircleOutlined />} onClick={() => setRejectModal(r.id)}>প্রত্যাখ্যান</Button>
                      <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApprove(r.id)}>অনুমোদন</Button>
                    </div>
                  </Card>
                ))}
              </>
            ),
          },
          {
            key: 'history',
            label: 'ইতিহাস',
            children: (
              <Table
                dataSource={allRequests}
                columns={historyColumns}
                rowKey="id"
                size="small"
                scroll={{ x: 700 }}
                pagination={{ pageSize: 20, showSizeChanger: false }}
              />
            ),
          },
        ]}
      />

      <Modal
        title="প্রত্যাখ্যানের কারণ"
        open={rejectModal !== null}
        onCancel={() => { setRejectModal(null); setRejectReason(''); }}
        onOk={handleReject}
        okText="প্রত্যাখ্যান করুন"
        cancelText="বাতিল"
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
      >
        <Input.TextArea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="প্রত্যাখ্যানের কারণ লিখুন..." />
      </Modal>

      <Modal
        title="স্টোর খরচপত্র — প্রিন্ট"
        open={!!printData}
        onCancel={() => setPrintData(null)}
        width={650}
        footer={[
          <Button key="close" onClick={() => setPrintData(null)}>বন্ধ করুন</Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>প্রিন্ট</Button>,
        ]}
      >
        {printData && (
          <div ref={printRef}>
            <div className="header" style={{ textAlign: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: '4px 0' }}>আনন্ত গার্মেন্টস লিমিটেড</h2>
              <p style={{ margin: '2px 0', color: '#555' }}>Ananta Garments Ltd.</p>
              <h3 style={{ margin: '8px 0 4px', borderBottom: '2px solid #333', display: 'inline-block', padding: '0 20px 4px' }}>স্টোর খরচপত্র</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #333', padding: '6px 10px', width: '50%' }}><strong>তারিখ:</strong> {dayjs(printData.requestedAt).format('DD/MM/YYYY')}</td>
                  <td style={{ border: '1px solid #333', padding: '6px 10px' }}><strong>অনুরোধ নং:</strong> SR-{String(printData.id).padStart(4, '0')}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #333', padding: '6px 10px' }}><strong>বিভাগ:</strong> সুইং (Sewing)</td>
                  <td style={{ border: '1px solid #333', padding: '6px 10px' }}><strong>কারখানা:</strong> {printData.facility || '—'}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #333', padding: '6px 10px' }}><strong>ফ্লোর:</strong> {printData.floor || '—'}</td>
                  <td style={{ border: '1px solid #333', padding: '6px 10px' }}><strong>লাইন:</strong> {printData.line || '—'}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #333', padding: '6px 10px' }} colSpan={2}><strong>মেশিন নং:</strong> {printData.machine?.machineId || printData.machineType} ({printData.machineType})</td>
                </tr>
              </tbody>
            </table>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #333', padding: '8px 10px', background: '#f0f0f0', width: '5%' }}>ক্র:</th>
                  <th style={{ border: '1px solid #333', padding: '8px 10px', background: '#f0f0f0' }}>মালামালের বিবরণ</th>
                  <th style={{ border: '1px solid #333', padding: '8px 10px', background: '#f0f0f0', width: '12%' }}>একক</th>
                  <th style={{ border: '1px solid #333', padding: '8px 10px', background: '#f0f0f0', width: '12%' }}>পরিমাণ</th>
                  <th style={{ border: '1px solid #333', padding: '8px 10px', background: '#f0f0f0', width: '25%' }}>মন্তব্য</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #333', padding: '8px 10px', textAlign: 'center' }}>১</td>
                  <td style={{ border: '1px solid #333', padding: '8px 10px' }}>{printData.part}</td>
                  <td style={{ border: '1px solid #333', padding: '8px 10px', textAlign: 'center' }}>{printData.unit || 'পিস'}</td>
                  <td style={{ border: '1px solid #333', padding: '8px 10px', textAlign: 'center' }}>{printData.qty}</td>
                  <td style={{ border: '1px solid #333', padding: '8px 10px' }}>{printData.reason || ''}</td>
                </tr>
                {[2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td style={{ border: '1px solid #333', padding: '8px 10px', textAlign: 'center' }}>{['২', '৩', '৪', '৫'][i - 2]}</td>
                    <td style={{ border: '1px solid #333', padding: '8px 10px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #333', padding: '8px 10px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #333', padding: '8px 10px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #333', padding: '8px 10px' }}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 60 }}>
              <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ borderTop: '1px solid #333', marginTop: 40, paddingTop: 4 }}>অনুরোধকারী (মেকানিক)</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{printData.requestedBy}</div>
              </div>
              <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ borderTop: '1px solid #333', marginTop: 40, paddingTop: 4 }}>অনুমোদনকারী (টেকনিক্যাল ম্যানেজার)</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{printData.approverName || ''}</div>
              </div>
              <div style={{ textAlign: 'center', width: '30%' }}>
                <div style={{ borderTop: '1px solid #333', marginTop: 40, paddingTop: 4 }}>স্টোর ইনচার্জ</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
