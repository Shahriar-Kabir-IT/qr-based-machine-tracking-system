import { useState } from 'react';
import { Layout, Menu, Button, Typography, Avatar, Drawer } from 'antd';
import {
  DashboardOutlined,
  DatabaseOutlined,
  SwapOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  BuildOutlined,
  ShopOutlined,
  LogoutOutlined,
  TeamOutlined,
  AlertOutlined,
  AppstoreOutlined,
  UserOutlined,
  MenuOutlined,
  CloseOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Header, Sider, Content } = Layout;

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  user: 'User',
  line_chief: 'Line Chief',
  mechanic: 'Mechanic',
  system_admin: 'System Admin',
};

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isSuperAdmin, isUser, isMechanic, isLineChief, isSystemAdmin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  let menuItems;
  if (isSystemAdmin) {
    menuItems = [
      { key: '/system', icon: <SettingOutlined />, label: 'System Admin' },
    ];
  } else if (isMechanic) {
    menuItems = [
      { key: '/mechanic', icon: <AlertOutlined />, label: 'Service Requests' },
    ];
  } else if (isLineChief) {
    menuItems = [
      { key: '/line-chief', icon: <DatabaseOutlined />, label: 'My Machines' },
      { key: '/line-chief/history', icon: <ThunderboltOutlined />, label: 'Service History' },
    ];
  } else if (isUser) {
    menuItems = [
      { key: '/user-dashboard', icon: <AppstoreOutlined />, label: `${user?.facility || ''} Dashboard` },
    ];
  } else {
    menuItems = [
      { key: '/', icon: <DashboardOutlined />, label: 'Dashboard' },
      { key: '/inventory', icon: <DatabaseOutlined />, label: 'Inventory' },
      { key: '/transfers', icon: <SwapOutlined />, label: 'Transfers' },
      { key: '/downtime', icon: <ThunderboltOutlined />, label: 'Downtime' },
      { key: '/maintenance', icon: <ToolOutlined />, label: 'Maintenance' },
      { key: '/spare-parts', icon: <BuildOutlined />, label: 'Spare Parts' },
      { key: '/rental', icon: <ShopOutlined />, label: 'Rental' },
      { key: '/mechanic-kpi', icon: <DashboardOutlined />, label: 'Mechanic KPI' },
      ...(isSuperAdmin
        ? [{ key: '/users', icon: <TeamOutlined />, label: 'User Management' }]
        : []),
    ];
  }

  const handleMenuClick = (key: string) => {
    navigate(key);
    setDrawerOpen(false);
  };

  const menuContent = (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={({ key }) => handleMenuClick(key)}
      style={{ background: 'transparent', border: 'none', marginTop: 8 }}
      theme="dark"
    />
  );

  const sidebarHeader = (
    <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <Typography.Title level={5} style={{ color: '#fff', margin: 0, letterSpacing: 0.5 }}>
        Ananta Sewing Machine
      </Typography.Title>
      <Typography.Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
        Inventory Transfer/Rent & Maintenance System
      </Typography.Text>
    </div>
  );

  const sidebarFooter = (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ marginBottom: 8 }}>
        <Typography.Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{user?.name}</Typography.Text>
        <br />
        <Typography.Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
          {roleLabels[user?.role || ''] || user?.role}
          {user?.facility ? ` — ${user.facility}` : ''}
          {user?.floor ? ` / ${user.floor}` : ''}
        </Typography.Text>
      </div>
      <Button
        type="text"
        icon={<LogoutOutlined />}
        onClick={logout}
        block
        style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'left', padding: '4px 0' }}
      >
        Logout
      </Button>
    </div>
  );

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', background: '#fff' }}>
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <Sider
        width={220}
        trigger={null}
        className="desktop-sider"
        style={{ background: '#141428', height: '100vh', position: 'relative' }}
      >
        {sidebarHeader}
        {menuContent}
        {sidebarFooter}
      </Sider>

      {/* Mobile drawer */}
      <Drawer
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={260}
        closable={false}
        styles={{ body: { padding: 0, background: '#141428' }, header: { display: 'none' } }}
      >
        <div style={{ position: 'relative', height: '100%' }}>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => setDrawerOpen(false)}
            style={{ position: 'absolute', top: 12, right: 12, color: 'rgba(255,255,255,0.5)', zIndex: 1 }}
          />
          {sidebarHeader}
          {menuContent}
          {sidebarFooter}
        </div>
      </Drawer>

      <Layout style={{ height: '100vh', background: '#fff' }}>
        <Header className="app-header">
          <div className="app-header-left">
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
              className="mobile-menu-btn"
            />
            <Typography.Text strong style={{ fontSize: 14 }}>{user?.name}</Typography.Text>
            <Typography.Text type="secondary" className="app-header-role">
              {roleLabels[user?.role || ''] || user?.role}
              {user?.facility ? ` — ${user.facility}` : ''}
              {user?.floor ? ` / ${user.floor}` : ''}
            </Typography.Text>
          </div>
          <div className="app-header-right">
            <Avatar style={{ backgroundColor: '#141428' }} size="small" icon={<UserOutlined />} />
            <Button type="text" icon={<LogoutOutlined />} onClick={logout} size="small" style={{ color: '#8c8c8c' }}>
              Logout
            </Button>
          </div>
        </Header>
        <Content style={{ padding: 0, background: '#fff', height: 'calc(100vh - 52px)', overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>

      <style>{`
        .app-header {
          background: #fff !important;
          padding: 0 16px !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          border-bottom: 1px solid #f0f0f0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          height: 52px !important;
          line-height: 1.3 !important;
          gap: 8px;
        }
        .app-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          overflow: hidden;
        }
        .app-header-role {
          font-size: 12px;
          white-space: nowrap;
        }
        .app-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .mobile-menu-btn {
          display: none !important;
        }
        @media (max-width: 992px) {
          .desktop-sider {
            display: none !important;
          }
          .mobile-menu-btn {
            display: inline-flex !important;
            font-size: 18px;
            padding: 4px 8px;
          }
          .app-header {
            padding: 0 12px !important;
          }
        }
        @media (max-width: 576px) {
          .app-header-left {
            gap: 6px;
          }
          .app-header-role {
            display: none;
          }
        }
      `}</style>
    </Layout>
  );
}
