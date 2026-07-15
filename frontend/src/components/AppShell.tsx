import type { ReactNode } from "react";
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { NavLink } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import PowerIcon from '@mui/icons-material/Power';
import PowerOffIcon from '@mui/icons-material/PowerOff';
import AddIcon from '@mui/icons-material/Add';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

interface AppShellProps {
  theme: "light" | "dark";
  loading: boolean;
  refreshAll: () => void;
  handlePowerOnAll: () => void;
  handlePowerOffAll: () => void;
  handleOpenModal: () => void;
  toggleTheme: () => void;
  children: ReactNode;
}

export default function AppShell({
  theme,
  loading,
  refreshAll,
  handlePowerOnAll,
  handlePowerOffAll,
  handleOpenModal,
  toggleTheme,
  children,
}: AppShellProps) {
  return (
    <>
      <AppBar position="fixed" color="default" elevation={3}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Herceg TV Control
          </Typography>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Tooltip title="Refresh">
              <span>
                <IconButton color="inherit" aria-label="refresh" onClick={refreshAll} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Power On All TVs">
              <span>
                <Button color="inherit" startIcon={<PowerIcon />} onClick={handlePowerOnAll}>
                  Upali sve
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Power Off All TVs">
              <span>
                <Button color="inherit" startIcon={<PowerOffIcon />} onClick={handlePowerOffAll}>
                  Isključi sve
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Add Device">
              <span>
                <Button color="inherit" startIcon={<AddIcon />} onClick={handleOpenModal}>
                  Dodaj
                </Button>
              </span>
            </Tooltip>
            <IconButton color="inherit" aria-label="toggle theme" onClick={toggleTheme}>
              {theme === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </div>
        </Toolbar>
      </AppBar>

      <div className={`app theme-${theme}`}>
        <aside className="sidebar">
          <h2>TV Upravljač</h2>
          <div className="sidebar-menu">
            <NavLink to="/" end className={({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')}>
              📊 Početna
            </NavLink>
            <NavLink to="/devices" className={({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')}>
              📺 Uređaji
            </NavLink>
            <NavLink to="/groups" className={({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')}>
              👥 Grupe
            </NavLink>
            <NavLink to="/audit" className={({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')}>
              📜 Audit log
            </NavLink>
            <NavLink to="/settings" className={({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')}>
              ⚙️ Postavke
            </NavLink>
          </div>
        </aside>

        <main className="content">{children}</main>
      </div>
    </>
  );
}
