import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Typography, message, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api/client';
import dayjs from 'dayjs';

const roleOptions = [
  { value: 'super_admin', label: 'Work Study (Super Admin)' },
  { value: 'admin', label: 'Administration Dept' },
  { value: 'user', label: 'Normal User' },
  { value: 'line_chief', label: 'Line Chief' },
  { value: 'mechanic', label: 'Mechanic' },
];

const roleColor: Record<string, string> = {
  super_admin: 'red',
  admin: 'blue',
  user: 'green',
  line_chief: 'cyan',
  mechanic: 'orange',
  system_admin: 'purple',
};

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    api.get('/users').then((res) => { setUsers(res.data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (values: any) => {
    if (editingUser) {
      if (!values.password) delete values.password;
      await api.put(`/users/${editingUser.id}`, values);
      message.success('User updated');
    } else {
      await api.post('/users', values);
      message.success('User created');
    }
    setModalOpen(false);
    setEditingUser(null);
    form.resetFields();
    load();
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    form.setFieldsValue({ ...user, password: '' });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    await api.delete(`/users/${id}`);
    message.success('User deleted');
    load();
  };

  const openCreate = () => {
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Username', dataIndex: 'username', key: 'username' },
    {
      title: 'Role', dataIndex: 'role', key: 'role',
      render: (r: string) => {
        const label = roleOptions.find((o) => o.value === r)?.label || r;
        return <Tag color={roleColor[r]}>{label}</Tag>;
      },
    },
    { title: 'Facility', dataIndex: 'facility', key: 'facility', render: (v: string) => v || '—' },
    { title: 'Created', dataIndex: 'createdAt', key: 'created', render: (v: string) => dayjs(v).format('DD MMM YYYY') },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Edit</Button>
          <Popconfirm title="Delete this user?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>User Management</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Create User</Button>
      </div>

      <Table dataSource={users} columns={columns} rowKey="id" loading={loading} size="small" />

      <Modal
        title={editingUser ? 'Edit User' : 'Create User'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingUser(null); }}
        onOk={() => form.submit()}
        okText={editingUser ? 'Save' : 'Create'}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="username" label="Username" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item
            name="password"
            label={editingUser ? 'Password (leave blank to keep current)' : 'Password'}
            rules={editingUser ? [] : [{ required: true }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item name="facility" label="Facility"><Input placeholder="e.g. AGL, ABM, ASL" /></Form.Item>
          <Form.Item name="floor" label="Floor"><Input placeholder="e.g. 3RD, 4TH" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
