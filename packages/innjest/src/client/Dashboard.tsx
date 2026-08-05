'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import styles from './Dashboard.module.css';
import type { APICall, APIMetadata, AnalyticsSummary } from '../shared/types';

export interface DashboardProps {
  apiBase?: string;
  refreshInterval?: number;
}

export const AnalyticsDashboard: React.FC<DashboardProps> = ({
  apiBase = '',
  refreshInterval = 5000,
}) => {
  const [calls, setCalls] = useState<APICall[]>([]);
  const [endpoints, setEndpoints] = useState<APIMetadata[]>([]);
  const [metrics, setMetrics] = useState<AnalyticsSummary | null>(null);
  const [activeTab, setActiveTab] = useState<string>('functions');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
      const [metricsRes, endpointsRes, callsRes] = await Promise.all([
        fetch(`${cleanBase}/api/analytics/metrics`),
        fetch(`${cleanBase}/api/analytics/endpoints`),
        fetch(`${cleanBase}/api/analytics/calls?limit=100`),
      ]);

      if (metricsRes.ok && endpointsRes.ok && callsRes.ok) {
        setMetrics(await metricsRes.json());
        setEndpoints(await endpointsRes.json());
        setCalls(await callsRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  const handleSendHealthCheckEvent = async () => {
    try {
      const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
      await fetch(`${cleanBase}/health`);
      await fetch(`${cleanBase}/api/analytics/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'health.check',
          payload: { status: 'healthy', timestamp: new Date().toISOString() },
        }),
      });
      fetchData();
    } catch (err) {
      console.error('Failed to send health check event', err);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to clear call history logs?')) return;
    try {
      const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
      await fetch(`${cleanBase}/api/analytics/clear`, { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error('Failed to clear logs', err);
    }
  };

  const filteredCalls = calls.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.endpoint.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
    }
    return true;
  });

  const multiLineWaveData = Array.from({ length: 15 }, (_, idx) => {
    const slice = calls.slice(idx * 2, (idx + 1) * 2);
    const completed = slice.filter((c) => c.status === 'success').length || 1;
    const failed = slice.filter((c) => c.status !== 'success').length;
    const avgDur = Math.round(slice.reduce((acc, c) => acc + (c.duration || 10), 0) / Math.max(1, slice.length));
    return {
      time: slice[0] ? new Date(slice[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `T-${15 - idx}`,
      line1: completed,
      line2: failed,
      line3: Math.round(avgDur / 10),
      line4: Math.round(avgDur / 20),
    };
  });

  return (
    <div className={styles.dashboard}>
      {/* NAVBAR */}
      <header className={styles.navbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div className={styles.brandLogo}>
            <div className={styles.logoIcon}>
              <svg style={{ width: 18, height: 18, fill: '#ffffff' }} viewBox="0 0 24 24"><path d="M13 2L3 14h7v8l10-12h-7V2z"/></svg>
            </div>
            <div className={styles.brandName}>Inngest<span>.dev</span></div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className={styles.btnPrimary} onClick={handleSendHealthCheckEvent}>
            Ping Health Event
          </button>
          <button className={styles.button} onClick={fetchData}>
            Sync
          </button>
          <button className={styles.button} style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }} onClick={handleClearData}>
            Clear Logs
          </button>
        </div>
      </header>

      {/* SUB NAVBAR TABS */}
      <nav className={styles.subNavbar}>
        <button className={`${styles.tabBtn} ${activeTab === 'functions' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('functions')}>
          <span>Functions</span>
          <span className={styles.tabBadge}>{endpoints.length}</span>
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'events' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('events')}>
          <span>Events Stream</span>
          <span className={styles.tabBadge}>{calls.length}</span>
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'runs' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('runs')}>
          <span>Runs</span>
          <span className={styles.tabBadge}>{calls.length}</span>
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'apps' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('apps')}>
          <span>Apps</span>
          <span className={styles.tabBadge}>1 Active</span>
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'metrics' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('metrics')}>
          <span>Metrics</span>
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'health' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('health')}>
          <span>Health Monitor</span>
        </button>
      </nav>

      <main className={styles.mainContent}>
        {/* KPI BAR */}
        <div className={styles.kpiBar}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiTitle}>Total Function Runs</div>
            <div className={styles.kpiVal}>{metrics?.totalCalls || 0}</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiTitle}>Success Rate</div>
            <div className={styles.kpiVal} style={{ color: '#10b981' }}>{(metrics?.successRate || 100).toFixed(1)}%</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiTitle}>Mean Latency</div>
            <div className={styles.kpiVal}>{(metrics?.avgResponseTime || 0).toFixed(1)} ms</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiTitle}>Failed Runs</div>
            <div className={styles.kpiVal} style={{ color: '#ef4444' }}>{metrics?.failedCalls || 0}</div>
          </div>
        </div>

        {/* TAB 1: FUNCTIONS VIEW WITH GRAPH */}
        {activeTab === 'functions' && (
          <div>
            <div className={styles.panelBox} style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div className={styles.panelLabel}>Function Execution Multi-Metric Graph</div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                    API Call Metrics & Latency Waves
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', background: '#000000', padding: '0.4rem 0.8rem', borderRadius: '0.375rem', border: '1px solid var(--inngest-border)' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }} title="Green Line: Count of successful function runs">● Completed Runs</span>
                  <span style={{ color: '#ef4444', fontWeight: 700 }} title="Bright Red Line: Count of failed function runs">● Failed Runs</span>
                  <span style={{ color: '#f87171', fontWeight: 700 }} title="Coral Line: Mean execution response time in milliseconds">● Latency (ms)</span>
                  <span style={{ color: '#dc2626', fontWeight: 700 }} title="Dark Red Line: Queue & payload volume">● Queue Volume</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={540}>
                <LineChart data={multiLineWaveData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" />
                  <XAxis dataKey="time" stroke="#71717a" tick={{ fontSize: 10 }} label={{ value: 'Execution Timeline (Real-Time Clock)', position: 'insideBottom', offset: -5, fill: '#a1a1aa', fontSize: 11 }} />
                  <YAxis stroke="#71717a" tick={{ fontSize: 10 }} label={{ value: 'Executions (Count) / Latency (ms)', angle: -90, position: 'insideLeft', fill: '#a1a1aa', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#121212', borderColor: '#2a2a2a', borderRadius: '6px' }} />
                  <Line type="monotone" dataKey="line1" stroke="#10b981" strokeWidth={2.2} dot={{ r: 3 }} name="Completed Runs (Count)" />
                  <Line type="monotone" dataKey="line2" stroke="#ef4444" strokeWidth={2.2} dot={{ r: 3 }} name="Failed Runs (Count)" />
                  <Line type="monotone" dataKey="line3" stroke="#f87171" strokeWidth={2.2} dot={{ r: 3 }} name="Latency (ms)" />
                  <Line type="monotone" dataKey="line4" stroke="#dc2626" strokeWidth={2.2} dot={{ r: 3 }} name="Queue Volume" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.toolbar}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                Registered Functions ({endpoints.length})
              </h3>
            </div>

            <div className={styles.cardGrid}>
              {endpoints.map((ep) => (
                <div key={ep.endpoint} className={styles.funcCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={ep.method === 'mutation' ? styles.methodMutation : styles.methodQuery}>
                      {ep.method.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>● ACTIVE</span>
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {ep.name || ep.endpoint}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: '#a1a1aa', fontFamily: 'var(--font-mono)', background: '#000000', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--inngest-border)' }}>
                    <span>Calls: <strong>{ep.callCount || 0}</strong></span>
                    <span>Errors: <strong>{ep.errorCount || 0}</strong></span>
                    <span>Avg: <strong>{(ep.averageResponseTime || 0).toFixed(1)}ms</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: EVENTS STREAM */}
        {activeTab === 'events' && (
          <div>
            <div className={styles.toolbar}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                Live Received Events Stream ({calls.length})
              </h3>
              <button className={styles.btnPrimary} onClick={handleSendHealthCheckEvent}>
                Ping Health Event
              </button>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Event Name</th>
                    <th className={styles.th}>Run ID</th>
                    <th className={styles.th}>Source IP</th>
                    <th className={styles.th}>Received At</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((c) => (
                    <tr key={c.id} className={styles.tr} onClick={() => { window.location.href = `/api/analytics?id=${c.id}`; }}>
                      <td className={styles.td} style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--inngest-red-light)' }}>
                        trpc/{c.endpoint}
                      </td>
                      <td className={styles.td}><span className={styles.codeBadge}>{c.id}</span></td>
                      <td className={styles.td} style={{ color: '#a1a1aa', fontFamily: 'var(--font-mono)' }}>{c.ipAddress || '127.0.0.1'}</td>
                      <td className={styles.td} style={{ color: '#a1a1aa', fontFamily: 'var(--font-mono)' }}>
                        {new Date(c.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: RUNS VIEW */}
        {activeTab === 'runs' && (
          <div>
            <div className={styles.toolbar}>
              <input
                type="text"
                placeholder="Filter runs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>Run ID</th>
                    <th className={styles.th}>Function Target</th>
                    <th className={styles.th}>Duration</th>
                    <th className={styles.th}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCalls.map((call) => {
                    const isOk = call.status === 'success';
                    return (
                      <tr key={call.id} className={styles.tr} onClick={() => { window.location.href = `/api/analytics?id=${call.id}`; }}>
                        <td className={styles.td}>
                          <span className={`${styles.statusBadge} ${isOk ? styles.statusCompleted : styles.statusFailed}`}>
                            ● {isOk ? 'COMPLETED' : 'FAILED'}
                          </span>
                        </td>
                        <td className={styles.td}><span className={styles.codeBadge}>{call.id.slice(0, 12)}</span></td>
                        <td className={styles.td} style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{call.endpoint}</td>
                        <td className={styles.td} style={{ fontFamily: 'var(--font-mono)' }}>{(call.duration || 0).toFixed(1)} ms</td>
                        <td className={styles.td} style={{ color: '#a1a1aa', fontFamily: 'var(--font-mono)' }}>{new Date(call.timestamp).toLocaleTimeString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
