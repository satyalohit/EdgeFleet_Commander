import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Database, 
  Shield, 
  Monitor, 
  Save, 
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { alertApi } from "@/services/api";

export default function Settings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    notifications: {
      emailAlerts: true,
      pushNotifications: false,
      criticalOnly: false,
      alertFrequency: "immediate"
    },
    dashboard: {
      autoRefresh: true,
      refreshInterval: 30,
      defaultView: "overview",
      darkMode: false
    },
    system: {
      telemetryRetention: 90,
      logLevel: "info",
      maintenanceMode: false,
      apiRateLimit: 1000
    },
    security: {
      sessionTimeout: 30,
      requireAuth: true,
      allowedIPs: "",
      twoFactorAuth: false
    }
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["/api/alerts"],
    queryFn: alertApi.getAlerts,
  });

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Simulate saving settings to backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Settings Saved",
        description: "Your configuration has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportSettings = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      settings,
      systemInfo: {
        version: "1.0.0",
        platform: "EdgeFleet Commander"
      }
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edgefleet-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Settings Exported",
      description: "Configuration file has been downloaded.",
    });
  };

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedSettings = JSON.parse(e.target?.result as string);
            if (importedSettings.settings) {
              setSettings(importedSettings.settings);
              toast({
                title: "Settings Imported",
                description: "Configuration has been loaded successfully.",
              });
            }
          } catch (error) {
            toast({
              title: "Import Error",
              description: "Invalid settings file format.",
              variant: "destructive",
            });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleResetSettings = () => {
    if (confirm("Are you sure you want to reset all settings to default values?")) {
      setSettings({
        notifications: {
          emailAlerts: true,
          pushNotifications: false,
          criticalOnly: false,
          alertFrequency: "immediate"
        },
        dashboard: {
          autoRefresh: true,
          refreshInterval: 30,
          defaultView: "overview",
          darkMode: false
        },
        system: {
          telemetryRetention: 90,
          logLevel: "info",
          maintenanceMode: false,
          apiRateLimit: 1000
        },
        security: {
          sessionTimeout: 30,
          requireAuth: true,
          allowedIPs: "",
          twoFactorAuth: false
        }
      });
      
      toast({
        title: "Settings Reset",
        description: "All settings have been restored to default values.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header alertCount={alerts.filter(a => !a.acknowledged).length} />
      <div className="flex">
        <Sidebar alertCount={alerts.filter(a => !a.acknowledged).length} />
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500">Configure your EdgeFleet Commander platform</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleImportSettings}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button variant="outline" onClick={handleExportSettings}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" onClick={handleResetSettings}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={handleSaveSettings} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>

            {/* Settings Tabs */}
            <Tabs defaultValue="notifications" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="notifications" className="flex items-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <span>Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="flex items-center space-x-2">
                  <Monitor className="h-4 w-4" />
                  <span>Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span>System</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Security</span>
                </TabsTrigger>
              </TabsList>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Alert Notifications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Alerts</Label>
                        <p className="text-sm text-gray-500">Receive alerts via email</p>
                      </div>
                      <Switch
                        checked={settings.notifications.emailAlerts}
                        onCheckedChange={(checked) =>
                          setSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, emailAlerts: checked }
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-gray-500">Browser push notifications</p>
                      </div>
                      <Switch
                        checked={settings.notifications.pushNotifications}
                        onCheckedChange={(checked) =>
                          setSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, pushNotifications: checked }
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Critical Alerts Only</Label>
                        <p className="text-sm text-gray-500">Only receive critical severity alerts</p>
                      </div>
                      <Switch
                        checked={settings.notifications.criticalOnly}
                        onCheckedChange={(checked) =>
                          setSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, criticalOnly: checked }
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Alert Frequency</Label>
                      <Select
                        value={settings.notifications.alertFrequency}
                        onValueChange={(value) =>
                          setSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, alertFrequency: value }
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="hourly">Hourly Digest</SelectItem>
                          <SelectItem value="daily">Daily Summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Dashboard Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto Refresh</Label>
                        <p className="text-sm text-gray-500">Automatically refresh dashboard data</p>
                      </div>
                      <Switch
                        checked={settings.dashboard.autoRefresh}
                        onCheckedChange={(checked) =>
                          setSettings(prev => ({
                            ...prev,
                            dashboard: { ...prev.dashboard, autoRefresh: checked }
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Refresh Interval (seconds)</Label>
                      <Input
                        type="number"
                        value={settings.dashboard.refreshInterval}
                        onChange={(e) =>
                          setSettings(prev => ({
                            ...prev,
                            dashboard: { ...prev.dashboard, refreshInterval: parseInt(e.target.value) }
                          }))
                        }
                        min="10"
                        max="300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Default View</Label>
                      <Select
                        value={settings.dashboard.defaultView}
                        onValueChange={(value) =>
                          setSettings(prev => ({
                            ...prev,
                            dashboard: { ...prev.dashboard, defaultView: value }
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="overview">Overview</SelectItem>
                          <SelectItem value="devices">Devices</SelectItem>
                          <SelectItem value="telemetry">Telemetry</SelectItem>
                          <SelectItem value="analytics">Analytics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Dark Mode</Label>
                        <p className="text-sm text-gray-500">Enable dark theme</p>
                      </div>
                      <Switch
                        checked={settings.dashboard.darkMode}
                        onCheckedChange={(checked) =>
                          setSettings(prev => ({
                            ...prev,
                            dashboard: { ...prev.dashboard, darkMode: checked }
                          }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* System Tab */}
              <TabsContent value="system" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>System Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Telemetry Retention (days)</Label>
                      <Input
                        type="number"
                        value={settings.system.telemetryRetention}
                        onChange={(e) =>
                          setSettings(prev => ({
                            ...prev,
                            system: { ...prev.system, telemetryRetention: parseInt(e.target.value) }
                          }))
                        }
                        min="1"
                        max="365"
                      />
                      <p className="text-sm text-gray-500">Number of days to retain telemetry data</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Log Level</Label>
                      <Select
                        value={settings.system.logLevel}
                        onValueChange={(value) =>
                          setSettings(prev => ({
                            ...prev,
                            system: { ...prev.system, logLevel: value }
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="debug">Debug</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warn">Warning</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>API Rate Limit (requests/hour)</Label>
                      <Input
                        type="number"
                        value={settings.system.apiRateLimit}
                        onChange={(e) =>
                          setSettings(prev => ({
                            ...prev,
                            system: { ...prev.system, apiRateLimit: parseInt(e.target.value) }
                          }))
                        }
                        min="100"
                        max="10000"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Maintenance Mode</Label>
                        <p className="text-sm text-gray-500">Enable system maintenance mode</p>
                      </div>
                      <Switch
                        checked={settings.system.maintenanceMode}
                        onCheckedChange={(checked) =>
                          setSettings(prev => ({
                            ...prev,
                            system: { ...prev.system, maintenanceMode: checked }
                          }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Session Timeout (minutes)</Label>
                      <Input
                        type="number"
                        value={settings.security.sessionTimeout}
                        onChange={(e) =>
                          setSettings(prev => ({
                            ...prev,
                            security: { ...prev.security, sessionTimeout: parseInt(e.target.value) }
                          }))
                        }
                        min="5"
                        max="480"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Require Authentication</Label>
                        <p className="text-sm text-gray-500">Enforce user authentication</p>
                      </div>
                      <Switch
                        checked={settings.security.requireAuth}
                        onCheckedChange={(checked) =>
                          setSettings(prev => ({
                            ...prev,
                            security: { ...prev.security, requireAuth: checked }
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Two-Factor Authentication</Label>
                        <p className="text-sm text-gray-500">Enable 2FA for additional security</p>
                      </div>
                      <Switch
                        checked={settings.security.twoFactorAuth}
                        onCheckedChange={(checked) =>
                          setSettings(prev => ({
                            ...prev,
                            security: { ...prev.security, twoFactorAuth: checked }
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Allowed IP Addresses</Label>
                      <Input
                        placeholder="192.168.1.0/24, 10.0.0.1"
                        value={settings.security.allowedIPs}
                        onChange={(e) =>
                          setSettings(prev => ({
                            ...prev,
                            security: { ...prev.security, allowedIPs: e.target.value }
                          }))
                        }
                      />
                      <p className="text-sm text-gray-500">Comma-separated list of allowed IP ranges</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* System Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="h-5 w-5" />
                  <span>System Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Platform Version</Label>
                    <p className="text-lg font-mono">v1.0.0</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Database Status</Label>
                    <Badge variant="default" className="mt-1">Connected</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Last Updated</Label>
                    <p className="text-sm text-gray-500">{new Date().toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}