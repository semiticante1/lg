// Presentational devices page extracted from App.tsx
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Pagination from '@mui/material/Pagination';
import PaginationItem from '@mui/material/PaginationItem';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import { useEffect, useState, type FC } from 'react';
import type {
  Device,
  DeviceHistoryEntry,
  DeviceSchedule,
  Group,
  MessageModalState,
} from '../types/app';

interface Props {
  devices: Device[];
  groups: Group[];
  search: string;
  setSearch: (value: string) => void;
  groupFilter: number | null;
  setGroupFilter: (value: number | null) => void;
  registrationFrom: string;
  setRegistrationFrom: (value: string) => void;
  registrationTo: string;
  setRegistrationTo: (value: string) => void;
  selectedDevice: Device | null;
  handleClearSelection: () => void;
  handleRestartSelected: () => void;
  handleDeleteSelected: () => void;
  openAssignGroupModal: () => void;
  loading: boolean;
  filteredDevices: Device[];
  toggleDevice: (id: number) => void;
  formatPowerText: (value: string) => string;
  formatStatusText: (value: string) => string;
  handleViewDevice: (id: number) => void;
  setEditingId: (id: number | null) => void;
  setDeviceName: (value: string) => void;
  setDeviceIp: (value: string) => void;
  setDeviceMac: (value: string) => void;
  setModalGroupId: (value: number | null) => void;
  setShowModal: (value: boolean) => void;
  handleOpenAuditForDevice: (id: number) => void;
  handleRestartDevice: (id: number) => void;
  setPendingDelete: (id: number | null) => void;
  setShowDeleteConfirm: (value: boolean) => void;
  showDeleteConfirm: boolean;
  cancelDelete: () => void;
  confirmDelete: () => void;
  showAssignGroupModal: boolean;
  setShowAssignGroupModal: (value: boolean) => void;
  selectedAssignGroupId: number | null;
  setSelectedAssignGroupId: (value: number | null) => void;
  assignGroupToSelected: () => void;
  messageModal: MessageModalState | null;
  setMessageModal: (value: MessageModalState | null) => void;
  closeMessageModal: () => void;
  handleMessageConfirm: () => void;
  selectedDeviceHistory: DeviceHistoryEntry[];
  volumeValue: string;
  setVolumeValue: (value: string) => void;
  launchTarget: string;
  setLaunchTarget: (value: string) => void;
  detailTab: 'info' | 'schedule';
  setDetailTab: (value: 'info' | 'schedule') => void;
  getDeviceSchedules: (deviceId: number) => DeviceSchedule[];
  getAvailableActions: (device: Device | null) => Array<{ value: string; label: string }>;
  getActionLabel: (action: string) => string;
  handleToggleSchedule: (schedule: DeviceSchedule) => void;
  fetchScheduleLogs: (schedule: DeviceSchedule) => void;
  handleTriggerSchedule: (schedule: DeviceSchedule) => void;
  handleEditSchedule: (schedule: DeviceSchedule) => void;
  handleDeleteSchedule: (scheduleId: number) => void;
  setShowScheduleBuilder: (value: boolean) => void;
  scheduleCron: string;
  setScheduleCron: (value: string) => void;
  scheduleUseTime: boolean;
  setScheduleUseTime: (value: boolean) => void;
  scheduleTime: string;
  setScheduleTime: (value: string) => void;
  cronValid: boolean;
  scheduleAction: string;
  setScheduleAction: (value: string) => void;
  scheduleTarget: string;
  setScheduleTarget: (value: string) => void;
  currentStepAction: string;
  setCurrentStepAction: (value: string) => void;
  handlePowerOnDevice: (id: number) => void;
  handlePowerOffDevice: (id: number) => void;
  handleSendDeviceAction: (id: number, action: string, params?: Record<string, unknown>) => void;
  getAvailableActionsForDevice: (device: Device | null) => Array<{ value: string; label: string }>;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  powerFilter: string;
  setPowerFilter: (value: string) => void;
  activityFilter: string;
  setActivityFilter: (value: string) => void;
  showMessage: (title: string, message: string) => void;
}

const Devices: FC<Props> = (props) => {
  const {
    devices,
    search,
    setSearch,
    groupFilter,
    setGroupFilter,
    registrationFrom,
    setRegistrationFrom,
    registrationTo,
    setRegistrationTo,
    selectedDevice,
    handleClearSelection,
    handleRestartSelected,
    handleDeleteSelected,
    openAssignGroupModal,
    loading,
    filteredDevices,
    toggleDevice,
    formatPowerText,
    formatStatusText,
    handleViewDevice,
    setEditingId,
    setDeviceName,
    setDeviceIp,
    setDeviceMac,
    setModalGroupId,
    setShowModal,
    handleOpenAuditForDevice,
    handleRestartDevice,
    setPendingDelete,
    setShowDeleteConfirm,
    showDeleteConfirm,
    cancelDelete,
    confirmDelete,
    showAssignGroupModal,
    setShowAssignGroupModal,
    selectedAssignGroupId,
    setSelectedAssignGroupId,
    assignGroupToSelected,
    messageModal,
    setMessageModal,
    closeMessageModal,
    handleMessageConfirm,
    selectedDeviceHistory,
    volumeValue,
    setVolumeValue,
    launchTarget,
    setLaunchTarget,
    detailTab,
    setDetailTab,
    getDeviceSchedules,
    getActionLabel,
    handleToggleSchedule,
    fetchScheduleLogs,
    handleTriggerSchedule,
    handleEditSchedule,
    handleDeleteSchedule,
    setShowScheduleBuilder,
    handlePowerOnDevice,
    handlePowerOffDevice,
    handleSendDeviceAction,
    statusFilter,
    setStatusFilter,
    powerFilter,
    setPowerFilter,
    activityFilter,
    setActivityFilter,
    groups,
  } = props;

  const [devicePage, setDevicePage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setDevicePage(1);
  }, [filteredDevices.length, search, groupFilter, statusFilter, powerFilter, activityFilter, registrationFrom, registrationTo]);

  const totalDevicePages = Math.max(1, Math.ceil(filteredDevices.length / pageSize));
  const paginatedDevices = filteredDevices.slice((devicePage - 1) * pageSize, devicePage * pageSize);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Uređaji
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Pronađi uređaje brzo, upravljaj grupama i primjeni postavke u nekoliko klikova.
        </Typography>
      </Box>

      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
          <DialogTitle>Potvrda brisanja</DialogTitle>
          <DialogContent>
            <Typography variant="body2">Da li želiš obrisati odabrani uređaj?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDelete}>Ne, poništi</Button>
            <Button onClick={confirmDelete} variant="contained" color="error">Da, obriši</Button>
          </DialogActions>
        </Dialog>
      )}

      {showAssignGroupModal && (
        <Dialog open={showAssignGroupModal} onClose={() => setShowAssignGroupModal(false)}>
          <DialogTitle>Dodaj u grupu</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 1 }}>Izaberi grupu za označene uređaje:</Typography>
            <FormControl size="small" sx={{ minWidth: 260, mt: 1 }}>
              <Select
                value={selectedAssignGroupId ?? ""}
                onChange={(e) => setSelectedAssignGroupId(e.target.value ? Number(e.target.value) : null)}
                displayEmpty
              >
                <MenuItem value="">Odaberi grupu</MenuItem>
                {groups?.map((group) => (
                  <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAssignGroupModal(false)}>Otkaži</Button>
            <Button onClick={assignGroupToSelected} variant="contained">Dodaj u grupu</Button>
          </DialogActions>
        </Dialog>
      )}

      {messageModal && (
        <Dialog open={!!messageModal} onClose={() => setMessageModal(null)} maxWidth="md" fullWidth>
          <DialogTitle>{messageModal.title}</DialogTitle>
          <DialogContent>
            {messageModal.title?.toLowerCase().includes('log') ? (
              <Typography
                component="pre"
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', m: 0, fontFamily: 'inherit' }}
              >
                {messageModal.message}
              </Typography>
            ) : (
              <Typography variant="body2">{messageModal.message}</Typography>
            )}
          </DialogContent>
          <DialogActions>
            {messageModal.onConfirm ? (
              <>
                <Button onClick={closeMessageModal}>{messageModal.cancelText || 'Odustani'}</Button>
                <Button onClick={handleMessageConfirm} variant="contained">{messageModal.confirmText || 'Potvrdi'}</Button>
              </>
            ) : (
              <Button onClick={closeMessageModal} variant="contained">U redu</Button>
            )}
          </DialogActions>
        </Dialog>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Ukupno uređaja</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{devices?.length ?? 0}</Typography>
            <Typography variant="caption" color="text.secondary">Sve jedinice</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Na mreži</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
              {devices?.filter((d) => d.status === 'Online').length ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">Aktivni uređaji</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">Van mreže</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
              {devices?.filter((d) => d.status === 'Offline').length ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">Nedostupni uređaji</Typography>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <TextField
          id="device-search"
          name="deviceSearch"
          variant="outlined"
          size="small"
          placeholder="Pretraži uređaj..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260, '& .MuiInputBase-root': { height: 42 } }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            value={groupFilter ?? ""}
            onChange={(e) => setGroupFilter(e.target.value ? Number(e.target.value) : null)}
          >
            <MenuItem value="">Sve grupe</MenuItem>
            <MenuItem value="-1">Bez grupe</MenuItem>
            {groups?.map((group) => (
              <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select value={statusFilter ?? 'all'} onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="all">Sve statuse</MenuItem>
            <MenuItem value="online">Samo online</MenuItem>
            <MenuItem value="offline">Samo offline</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select value={powerFilter ?? 'all'} onChange={(e) => setPowerFilter(e.target.value)}>
            <MenuItem value="all">Sve napajanja</MenuItem>
            <MenuItem value="on">Samo upaljeni</MenuItem>
            <MenuItem value="off">Samo ugašeni</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select value={activityFilter ?? 'all'} onChange={(e) => setActivityFilter(e.target.value)}>
            <MenuItem value="all">Sve aktivnosti</MenuItem>
            <MenuItem value="active24h">Aktivni 24h</MenuItem>
            <MenuItem value="active7d">Aktivni 7d</MenuItem>
            <MenuItem value="inactive7d">Neaktivni {'>'} 7d</MenuItem>
            <MenuItem value="inactive30d">Neaktivni {'>'} 30d</MenuItem>
          </Select>
        </FormControl>
        <TextField type="date" size="small" value={registrationFrom ?? ''} onChange={(e) => setRegistrationFrom(e.target.value)} sx={{ width: 180 }} />
        <TextField type="date" size="small" value={registrationTo ?? ''} onChange={(e) => setRegistrationTo(e.target.value)} sx={{ width: 180 }} />
        {selectedDevice && <Button variant="outlined" onClick={handleClearSelection}>Zatvori detalje</Button>}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
        <Button variant="outlined" color="warning" onClick={handleRestartSelected}>
          Restart označenih
        </Button>
        <Button variant="outlined" color="error" onClick={handleDeleteSelected}>
          Obriši odabrane
        </Button>
        <Button variant="contained" onClick={openAssignGroupModal}>
          Dodaj u grupu
        </Button>
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden', mb: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 3 }}>
            <CircularProgress size={22} />
            <Typography variant="body2">Učitavanje...</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Naziv</TableCell>
                  <TableCell>Marka</TableCell>
                  <TableCell>IP Adresa</TableCell>
                  <TableCell>MAC Adresa</TableCell>
                  <TableCell>Grupa</TableCell>
                  <TableCell>Registracija</TableCell>
                  <TableCell>Aktivnost</TableCell>
                  <TableCell>Napajanje</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Akcije</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
              {filteredDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Nema uređaja za prikaz.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDevices.map((device) => (
                  <TableRow key={device.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={device.selected} onChange={() => toggleDevice(device.id)} sx={{ padding: '6px' }} />
                    </TableCell>
                    <TableCell>{device.name}</TableCell>
                    <TableCell>{device.brand || 'generic'}</TableCell>
                    <TableCell>{device.ip}</TableCell>
                    <TableCell>{device.mac}</TableCell>
                    <TableCell>{device.groupName || '-'}</TableCell>
                    <TableCell>{device.created_at ? new Date(device.created_at).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{device.last_active_at ? new Date(device.last_active_at).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={formatPowerText(device.powerState)}
                        color={device.powerState === 'On' ? 'success' : 'default'}
                        variant={device.powerState === 'On' ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={formatStatusText(device.status)}
                        color={device.status === 'Online' ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Tooltip title="Pogledaj">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDevice(device.id)}
                            sx={(theme) =>
                              theme.palette.mode === 'light'
                                ? {
                                    color: 'text.primary',
                                    '& .MuiSvgIcon-root': { fontSize: 20 },
                                    '&:hover': { bgcolor: 'action.hover' },
                                  }
                                : {}
                            }
                          >
                            <VisibilityOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Uredi">
                          <IconButton
                            size="small"
                            onClick={() => { setEditingId(device.id); setDeviceName(device.name); setDeviceIp(device.ip); setDeviceMac(device.mac); setModalGroupId(device.groupId ?? null); setShowModal(true); }}
                            sx={(theme) =>
                              theme.palette.mode === 'light'
                                ? {
                                    color: 'text.primary',
                                    '& .MuiSvgIcon-root': { fontSize: 20 },
                                    '&:hover': { bgcolor: 'action.hover' },
                                  }
                                : {}
                            }
                          >
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Audit log">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenAuditForDevice(device.id)}
                            sx={(theme) =>
                              theme.palette.mode === 'light'
                                ? {
                                    color: 'text.primary',
                                    '& .MuiSvgIcon-root': { fontSize: 20 },
                                    '&:hover': { bgcolor: 'action.hover' },
                                  }
                                : {}
                            }
                          >
                            <DescriptionOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Restart">
                          <IconButton
                            size="small"
                            onClick={() => handleRestartDevice(device.id)}
                            sx={(theme) =>
                              theme.palette.mode === 'light'
                                ? {
                                    color: 'text.primary',
                                    '& .MuiSvgIcon-root': { fontSize: 20 },
                                    '&:hover': { bgcolor: 'action.hover' },
                                  }
                                : {}
                            }
                          >
                            <RestartAltOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Obriši">
                          <IconButton
                            size="small"
                            onClick={() => { setPendingDelete(device.id); setShowDeleteConfirm(true); }}
                            sx={(theme) =>
                              theme.palette.mode === 'light'
                                ? {
                                    color: theme.palette.error.main,
                                    '& .MuiSvgIcon-root': { fontSize: 20 },
                                    '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.08)' },
                                  }
                                : {}
                            }
                          >
                            <DeleteOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {filteredDevices.length > 0 ? `Prikazano ${paginatedDevices.length} od ${filteredDevices.length} uređaja` : 'Nema uređaja'}
        </Typography>
        <Pagination
          count={totalDevicePages}
          page={devicePage - 1}
          onChange={(_event, value) => setDevicePage(value)}
          siblingCount={1}
          boundaryCount={1}
          color="primary"
          renderItem={(item) => <PaginationItem {...item} />}
        />
      </Box>

      {selectedDevice && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Detalji uređaja</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2, mb: 2.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Naziv</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedDevice.name}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">IP adresa</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedDevice.ip}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">MAC adresa</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedDevice.mac}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <Button variant="contained" color="success" onClick={() => handlePowerOnDevice(selectedDevice.id)}>Uključi uređaj</Button>
            <Button variant="contained" color="error" onClick={() => handlePowerOffDevice(selectedDevice.id)}>Isključi uređaj</Button>
            <Button variant="outlined" color="warning" onClick={() => handleRestartDevice(selectedDevice.id)}>Restart uređaja</Button>
            {(["webos", "samsung"].includes((selectedDevice.brand || '').toLowerCase())) && (
              <>
                <Button variant="outlined" onClick={() => handleSendDeviceAction(selectedDevice.id, 'mute')}>Mute</Button>
                <Button variant="outlined" onClick={() => handleSendDeviceAction(selectedDevice.id, 'unmute')}>Unmute</Button>
                <Button variant="outlined" onClick={() => handleSendDeviceAction(selectedDevice.id, 'volumeUp')}>Vol+</Button>
                <Button variant="outlined" onClick={() => handleSendDeviceAction(selectedDevice.id, 'volumeDown')}>Vol-</Button>
                <TextField type="number" size="small" value={volumeValue} onChange={(e) => setVolumeValue(e.target.value)} placeholder="0-100" sx={{ width: 120 }} />
                <Button
                  variant="outlined"
                  disabled={volumeValue?.trim?.() === '' || Number.isNaN(Number(volumeValue)) || Number(volumeValue) < 0 || Number(volumeValue) > 100}
                  onClick={() => handleSendDeviceAction(selectedDevice.id, 'setVolume', { volume: Number(volumeValue) })}
                >
                  Postavi volumen
                </Button>
                <TextField size="small" value={launchTarget} onChange={(e) => setLaunchTarget(e.target.value)} placeholder="App ID ili URL" sx={{ minWidth: 220 }} />
                <Button variant="outlined" disabled={!launchTarget?.trim?.()} onClick={() => handleSendDeviceAction(selectedDevice.id, 'launchApp', { target: launchTarget.trim() })}>
                  Otvori aplikaciju
                </Button>
              </>
            )}
          </Box>

          <Tabs
            value={detailTab}
            onChange={(_event, value: 'info' | 'schedule') => setDetailTab(value)}
            sx={{ mt: 2.5, mb: 2 }}
          >
            <Tab value="info" label="Informacije" />
            <Tab value="schedule" label="Raspored" />
          </Tabs>

          {detailTab === 'info' ? (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Posljednji zapisi</Typography>
              {selectedDeviceHistory?.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Nema zapisa za ovaj uređaj.</Typography>
              ) : (
                <List dense>
                  {selectedDeviceHistory?.map((entry, index) => (
                    <ListItem key={`${selectedDevice.id}-${index}`}>
                      <ListItemText primary={`${entry.timestamp} - ${entry.status}`} secondary={entry.note} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          ) : (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Raspored za {selectedDevice.name}</Typography>
              {getDeviceSchedules(selectedDevice.id)?.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Nema spremljenih rasporeda.</Typography>
              ) : (
                <Box sx={{ display: 'grid', gap: 1 }}>
                  {getDeviceSchedules(selectedDevice.id).map((schedule) => (
                    <Paper key={schedule.id} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{schedule.cron}</Typography>
                      <Typography variant="caption" color="text.secondary">{getActionLabel(schedule.action)}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                        <Button size="small" variant={schedule.enabled ? 'contained' : 'outlined'} onClick={() => handleToggleSchedule(schedule)}>{schedule.enabled ? 'On' : 'Off'}</Button>
                        <Button size="small" variant="outlined" onClick={() => fetchScheduleLogs(schedule)}>Logovi</Button>
                        <Button size="small" variant="outlined" onClick={() => handleTriggerSchedule(schedule)}>Pokreni</Button>
                        <Button size="small" variant="outlined" onClick={() => handleEditSchedule(schedule)}>Uredi</Button>
                        <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteSchedule(schedule.id)}>Obriši</Button>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
              <Box sx={{ mt: 2 }}>
                <Button variant="outlined" onClick={() => setShowScheduleBuilder(true)}>Koristi vizualni raspored</Button>
              </Box>
            </Box>
          )}
        </Paper>
      )}
    </Container>
  );
};

export default Devices;
