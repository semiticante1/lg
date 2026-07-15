import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import type { Device, DeviceHistoryEntry, Group } from "../types/app";

type GroupStatusSummary = Group & {
  onlineCount: number;
  offlineCount: number;
};

type GroupHealth = GroupStatusSummary & {
  offlineRatio: number;
};

interface Props {
  devices: Device[];
  groupStatusSummary: GroupStatusSummary[];
  recentDeviceEvents: DeviceHistoryEntry[];
}

export default function Dashboard({ devices, groupStatusSummary, recentDeviceEvents }: Props) {
  const onlineColor = '#4caf50';
  const offlineColor = '#ef4444';

  const unassignedCount = devices.filter((device) => device.groupId === null).length;
  const groupHealth = groupStatusSummary
    .map((group): GroupHealth => ({
      ...group,
      offlineRatio: group.deviceCount ? group.offlineCount / group.deviceCount : 0,
    }))
    .sort((a, b) => b.offlineRatio - a.offlineRatio)
    .slice(0, 4);

  const recentOfflineEvents = recentDeviceEvents.filter((entry) => entry.status === "Offline").length;
  const dashboardInsights = [
    `Najviše offline ima ${groupHealth[0]?.name || "nijedna grupa"} (${groupHealth[0]?.offlineCount || 0}).`,
    `U mreži je ${unassignedCount} uređaja bez grupe.`,
    `Posljednja 4 događaja: ${recentOfflineEvents} offline zapisa.`,
  ];

  const onlineCount = devices.filter((device) => device.status === "Online").length;
  const offlineCount = devices.filter((device) => device.status === "Offline").length;
  const poweredOnCount = devices.filter((device) => device.powerState === "On").length;
  const selectedCount = devices.filter((device) => device.selected).length;

  const healthScore = devices.length > 0 ? Math.round((onlineCount / devices.length) * 100) : 0;
  const healthStatus = healthScore >= 80 ? "excellent" : healthScore >= 60 ? "good" : healthScore >= 40 ? "warning" : "critical";
  const criticalOfflineDevices = devices.filter((device) => device.status === "Offline").slice(0, 3);
  const hasCritical = offlineCount > 0;

  const healthColor =
    healthStatus === 'excellent'
      ? 'success.main'
      : healthStatus === 'good'
      ? 'info.main'
      : healthStatus === 'warning'
      ? 'warning.main'
      : 'error.main';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
        Početna
      </Typography>
      
      {/* Stats Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        {/* Total Devices Card */}
        <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 3 } }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h6" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Ukupno uređaja
              </Typography>
              <Typography sx={{ fontSize: '1.5rem' }}>📦</Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              {devices.length}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Sve jedinice
            </Typography>
          </CardContent>
        </Card>

        {/* Online Devices Card */}
        <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 3 } }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h6" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Na mreži
              </Typography>
              <Typography sx={{ fontSize: '1.5rem' }}>✅</Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'success.main' }}>
              {onlineCount}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Aktivni uređaji
            </Typography>
          </CardContent>
        </Card>

        {/* Offline Devices Card */}
        <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 3 } }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h6" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Van mreže
              </Typography>
              <Typography sx={{ fontSize: '1.5rem' }}>⛔</Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'error.main' }}>
              {offlineCount}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Nedostupni uređaji
            </Typography>
          </CardContent>
        </Card>

        {/* Powered On Card */}
        <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 3 } }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h6" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Uključeno
              </Typography>
              <Typography sx={{ fontSize: '1.5rem' }}>⚡</Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'warning.main' }}>
              {poweredOnCount}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Napajanje aktivno
            </Typography>
          </CardContent>
        </Card>

        {/* Selected Card */}
        <Card sx={{ boxShadow: 1, '&:hover': { boxShadow: 3 } }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h6" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                Odabrano
              </Typography>
              <Typography sx={{ fontSize: '1.5rem' }}>🎯</Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'info.main' }}>
              {selectedCount}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Trenutno označeno
            </Typography>
          </CardContent>
        </Card>
      </Box>
      {/* Critical Offline Alert */}
      {hasCritical && (
        <Alert severity="error" sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1 }}>
            <Typography sx={{ fontSize: '1.25rem' }}>⚠️</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              UPOZORENJE - Kritični uređaji offline
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {criticalOfflineDevices.map((device) => (
              <Typography key={device.id} variant="body2">
                • {device.name} ({device.ip})
              </Typography>
            ))}
          </Box>
        </Alert>
      )}
      {/* Network Health Section */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Zdravlje mreže
          </Typography>
          <Chip
            label={`${healthScore}%`}
            color={healthStatus === 'excellent' ? 'success' : healthStatus === 'good' ? 'info' : healthStatus === 'warning' ? 'warning' : 'error'}
            variant="filled"
            sx={{ fontSize: '1rem', height: 32 }}
          />
        </Box>
        <LinearProgress
          variant="determinate"
          value={healthScore}
          sx={{
            height: 12,
            borderRadius: 6,
            mb: 2,
            backgroundColor: 'action.disabledBackground',
            '& .MuiLinearProgress-bar': {
              borderRadius: 6,
              backgroundColor: healthColor,
            },
          }}
        />
        <Typography variant="body2" color="textSecondary">
          {healthStatus === 'excellent' && '✓ Mreža je u odličnom stanju! Svi uređaji su dostupni.'}
          {healthStatus === 'good' && '✓ Mreža je u dobrom stanju. Većina uređaja je dostupna.'}
          {healthStatus === 'warning' && '⚠ Mreža zahtjeva pažnju. Nekoliko uređaja je van mreže.'}
          {healthStatus === 'critical' && '✗ Mreža je u kritičnom stanju! Mnogi uređaji su van mreže.'}
        </Typography>
      </Paper>

      {/* Distribution Charts */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          mb: 4,
        }}
      >
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Uređaji na mreži
            </Typography>
            <LinearProgress
              variant="determinate"
              value={devices.length ? (onlineCount / devices.length) * 100 : 0}
              sx={{
                height: 10,
                borderRadius: 5,
                mb: 2,
                backgroundColor: 'action.disabledBackground',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'success.main',
                },
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {onlineCount}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                od {devices.length} ukupno
              </Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Uređaji van mreže
            </Typography>
            <LinearProgress
              variant="determinate"
              value={devices.length ? (offlineCount / devices.length) * 100 : 0}
              sx={{
                height: 10,
                borderRadius: 5,
                mb: 2,
                backgroundColor: 'action.disabledBackground',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'error.main',
                },
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {offlineCount}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                od {devices.length} ukupno
              </Typography>
            </Box>
          </Paper>
      </Box>

      {/* Device Status Distribution */}
      {devices.length > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Distribuacija statusa uređaja
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 3,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Donut Chart */}
            <Box sx={{ position: 'relative', width: 180, height: 180 }}>
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: `conic-gradient(
                    ${onlineColor} 0deg ${devices.length ? (onlineCount / devices.length) * 360 : 0}deg,
                    ${offlineColor} ${devices.length ? (onlineCount / devices.length) * 360 : 0}deg 360deg
                  )`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Box
                  sx={{
                    width: 140,
                    height: 140,
                    borderRadius: '50%',
                    bgcolor: 'background.paper',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {devices.length}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    uređaja
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Legend */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: onlineColor }} />
                <Typography variant="body2">
                  Na mreži ({onlineCount})
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: offlineColor }} />
                <Typography variant="body2">
                  Van mreže ({offlineCount})
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Group Health Status */}
      {groupStatusSummary.length > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Zdravlje grupa po dostupnosti
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: 3,
            }}
          >
            {groupStatusSummary.slice(0, 4).map((group) => {
              const healthPercent = group.deviceCount ? (group.onlineCount / group.deviceCount) * 100 : 0;
              return (
                <Box key={group.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Box sx={{ position: 'relative', width: 120, height: 120, mb: 1.5 }}>
                      <CircularProgress
                        variant="determinate"
                        value={100}
                        size={120}
                        thickness={4}
                        sx={{
                          color: 'action.disabledBackground',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                        }}
                      />
                      <CircularProgress
                        variant="determinate"
                        value={healthPercent}
                        size={120}
                        thickness={4}
                        sx={{
                          color:
                            healthPercent > 50
                              ? 'success.main'
                              : healthPercent > 20
                              ? 'warning.main'
                              : 'error.main',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          bottom: 0,
                          left: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          zIndex: 1,
                          pointerEvents: 'none',
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                          {Math.round(healthPercent)}%
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {group.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {group.onlineCount}/{group.deviceCount} dostupnih
                    </Typography>
                  </Box>
              );
            })}
          </Box>
        </Paper>
      )}

      {/* Dashboard Panels */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
        }}
      >
        {/* Group Health Tracking */}
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Grupe koje trebaju pažnju
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Prati grupe prema udjelu offline uređaja i brzo vidi gdje treba intervenirati.
            </Typography>
            {groupHealth.length === 0 ? (
              <Typography variant="body2" color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>
                Nema dovoljno podataka za grupnu analizu.
              </Typography>
            ) : (
              <List disablePadding>
                {groupHealth.map((group) => (
                  <ListItem key={group.id} disableGutters sx={{ mb: 1, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {group.name}
                        </Typography>
                        <Chip
                          label={`${group.offlineCount}/${group.deviceCount} offline`}
                          size="small"
                          color={group.offlineRatio > 0.5 ? 'error' : group.offlineRatio > 0.2 ? 'warning' : 'success'}
                          variant="outlined"
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={group.deviceCount ? Math.round(group.offlineRatio * 100) : 0}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'action.disabledBackground',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: group.offlineRatio > 0.5 ? 'error.main' : group.offlineRatio > 0.2 ? 'warning.main' : 'success.main',
                          },
                        }}
                      />
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>

        {/* Operational Insights */}
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              Operativni uvidi
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Kratki pregled najvažnijih stanja i preporuka za akciju.
            </Typography>
            <List disablePadding>
              {dashboardInsights.map((insight, index) => (
                <ListItem key={index} disableGutters sx={{ mb: 1, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {insight}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
      </Box>
    </Container>
  );
}
