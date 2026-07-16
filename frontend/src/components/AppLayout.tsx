import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Tv as TvIcon,
  People as PeopleIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Power as PowerIcon,
  PowerOff as PowerOffIcon,
  Add as AddIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
} from '@mui/icons-material';

interface AppLayoutProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  loading: boolean;
  refreshAll: () => void;
  handlePowerOnAll: () => void;
  handlePowerOffAll: () => void;
  handleOpenModal: () => void;
  children: React.ReactNode;
  lastRefresh?: string;
}

const drawerWidth = 280;

export default function AppLayout({
  theme,
  toggleTheme,
  loading,
  refreshAll,
  handlePowerOnAll,
  handlePowerOffAll,
  handleOpenModal,
  children,
  lastRefresh,
}: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const navigationItems = [
    { label: 'Dashboard', path: '/', icon: DashboardIcon },
    { label: 'Devices', path: '/devices', icon: TvIcon },
    { label: 'Groups', path: '/groups', icon: PeopleIcon },
    { label: 'Audit Log', path: '/audit', icon: DescriptionIcon },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <List sx={{ flex: 1, pt: 1 }}>
        {navigationItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={NavLink}
              to={item.path}
              selected={location.pathname === item.path || (item.path === '/' && location.pathname === '/')}
              sx={{
                mx: 1,
                mb: 0.5,
                borderRadius: 1,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                },
              }}
              onClick={() => setMobileOpen(false)}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <item.icon />
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />
      <Box sx={{ p: 1.5 }}>
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1, px: 1 }}>
          Status: {lastRefresh || 'Loading...'}
        </Typography>
        <Button
          size="small"
          fullWidth
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refreshAll}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          boxShadow: 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Herceg TV Control
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Tooltip title="Refresh Status">
              <Box component="span">
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={refreshAll}
                  disabled={loading}
                >
                  <RefreshIcon />
                </IconButton>
              </Box>
            </Tooltip>

            <Tooltip title="Power On All">
              <Box component="span">
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<PowerIcon />}
                  onClick={handlePowerOnAll}
                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  On
                </Button>
              </Box>
            </Tooltip>

            <Tooltip title="Power Off All">
              <Box component="span">
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<PowerOffIcon />}
                  onClick={handlePowerOffAll}
                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  Off
                </Button>
              </Box>
            </Tooltip>

            <Tooltip title="Add Device">
              <Box component="span">
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleOpenModal}
                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  Add
                </Button>
              </Box>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ my: 1, opacity: 0.5 }} />

            <Tooltip title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              <IconButton color="inherit" size="small" onClick={toggleTheme}>
                {theme === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer for Mobile */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>

      {/* Drawer for Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            top: 0,
            height: '100vh',
          },
        }}
        open
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: { sm: `${drawerWidth}px` },
          width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Spacing for fixed AppBar */}
        <Toolbar />

        {/* Page Content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: { xs: 1.5, sm: 2, md: 3 },
            backgroundColor: 'background.default',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
