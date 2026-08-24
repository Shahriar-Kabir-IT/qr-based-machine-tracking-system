import { Controller, Get, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from './auth/jwt-auth.guard';
import { UserRole } from './users/entities/user.entity';
import { DataSource } from 'typeorm';
import * as os from 'os';
import * as fs from 'fs';
import * as childProcess from 'child_process';

@Controller('api/system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
export class SystemController {
  constructor(private dataSource: DataSource) {}

  @Get('health')
  async health() {
    const dbOk = this.dataSource.isInitialized;
    let dbLatency = -1;
    try {
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      dbLatency = Date.now() - start;
    } catch {}

    return {
      status: dbOk ? 'ok' : 'error',
      database: {
        connected: dbOk,
        latencyMs: dbLatency,
        type: 'PostgreSQL',
        database: this.dataSource.options.database,
      },
      server: {
        uptime: Math.floor(process.uptime()),
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        nodeVersion: process.version,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('server-info')
  async serverInfo() {
    const mem = process.memoryUsage();
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    let diskInfo = { total: 0, used: 0, available: 0, usedPercent: 0 };
    try {
      const df = childProcess.execSync('df -k / | tail -1').toString().trim().split(/\s+/);
      diskInfo = {
        total: Math.round(parseInt(df[1]) / 1024 / 1024),
        used: Math.round(parseInt(df[2]) / 1024 / 1024),
        available: Math.round(parseInt(df[3]) / 1024 / 1024),
        usedPercent: Math.round((parseInt(df[2]) / parseInt(df[1])) * 100),
      };
    } catch {}

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      osRelease: os.release(),
      arch: os.arch(),
      cpuModel: cpus[0]?.model || 'Unknown',
      cpuCores: cpus.length,
      totalMemoryGB: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 10) / 10,
      freeMemoryGB: Math.round(os.freemem() / 1024 / 1024 / 1024 * 10) / 10,
      usedMemoryPercent: Math.round((1 - os.freemem() / os.totalmem()) * 100),
      loadAverage: { '1m': loadAvg[0].toFixed(2), '5m': loadAvg[1].toFixed(2), '15m': loadAvg[2].toFixed(2) },
      disk: diskInfo,
      process: {
        pid: process.pid,
        uptimeSeconds: Math.floor(process.uptime()),
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
        externalMB: Math.round(mem.external / 1024 / 1024),
      },
      nodeVersion: process.version,
      env: process.env.NODE_ENV || 'development',
    };
  }

  @Get('db-details')
  async dbDetails() {
    const results: any = {};

    try {
      const sizeResult = await this.dataSource.query(
        `SELECT pg_size_pretty(pg_database_size(current_database())) as size, pg_database_size(current_database()) as bytes`,
      );
      results.databaseSize = sizeResult[0].size;
      results.databaseSizeBytes = parseInt(sizeResult[0].bytes);
    } catch { results.databaseSize = 'N/A'; }

    try {
      const connResult = await this.dataSource.query(
        `SELECT count(*) as total, count(*) FILTER (WHERE state = 'active') as active, count(*) FILTER (WHERE state = 'idle') as idle FROM pg_stat_activity WHERE datname = current_database()`,
      );
      results.connections = {
        total: parseInt(connResult[0].total),
        active: parseInt(connResult[0].active),
        idle: parseInt(connResult[0].idle),
      };
    } catch { results.connections = { total: 0, active: 0, idle: 0 }; }

    try {
      const maxConn = await this.dataSource.query(`SHOW max_connections`);
      results.maxConnections = parseInt(maxConn[0].max_connections);
    } catch { results.maxConnections = 0; }

    try {
      const version = await this.dataSource.query(`SELECT version()`);
      results.pgVersion = version[0].version;
    } catch { results.pgVersion = 'N/A'; }

    try {
      const tableSizes = await this.dataSource.query(`
        SELECT relname as table,
               pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
               pg_total_relation_size(c.oid) as bytes,
               pg_size_pretty(pg_relation_size(c.oid)) as data_size,
               pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) as index_size
        FROM pg_class c
        LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE relkind = 'r' AND nspname = 'public'
        ORDER BY pg_total_relation_size(c.oid) DESC
      `);
      results.tableSizes = tableSizes;
    } catch { results.tableSizes = []; }

    try {
      const cacheHit = await this.dataSource.query(`
        SELECT round(100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2) as ratio
        FROM pg_stat_database WHERE datname = current_database()
      `);
      results.cacheHitRatio = cacheHit[0].ratio ? parseFloat(cacheHit[0].ratio) : 0;
    } catch { results.cacheHitRatio = 0; }

    try {
      const dbHost = (this.dataSource.options as any).host || 'localhost';
      const dbPort = (this.dataSource.options as any).port || 5432;
      results.connectionInfo = {
        host: dbHost,
        port: dbPort,
        database: this.dataSource.options.database,
      };
    } catch {}

    return results;
  }

  @Get('network')
  async networkCheck() {
    const checks: { name: string; host: string; status: string; latencyMs: number }[] = [];

    const dbHost = (this.dataSource.options as any).host || 'localhost';
    const dbPort = (this.dataSource.options as any).port || 5432;
    const dbStart = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      checks.push({ name: 'Database Server', host: `${dbHost}:${dbPort}`, status: 'ok', latencyMs: Date.now() - dbStart });
    } catch {
      checks.push({ name: 'Database Server', host: `${dbHost}:${dbPort}`, status: 'error', latencyMs: Date.now() - dbStart });
    }

    const localStart = Date.now();
    try {
      const http = require('http');
      await new Promise<void>((resolve, reject) => {
        const req = http.get('http://localhost:3000/api/auth/login', { timeout: 3000 }, () => { resolve(); });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      });
      checks.push({ name: 'Backend API (self)', host: 'localhost:3000', status: 'ok', latencyMs: Date.now() - localStart });
    } catch {
      checks.push({ name: 'Backend API (self)', host: 'localhost:3000', status: 'ok', latencyMs: Date.now() - localStart });
    }

    const interfaces = os.networkInterfaces();
    const networkInterfaces: { name: string; ip: string; mac: string; type: string }[] = [];
    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          networkInterfaces.push({ name, ip: addr.address, mac: addr.mac, type: addr.internal ? 'internal' : 'external' });
        }
      }
    }

    let dnsOk = false;
    try {
      const dns = require('dns');
      await new Promise<void>((resolve, reject) => {
        dns.resolve('google.com', (err: any) => { if (err) reject(err); else resolve(); });
      });
      dnsOk = true;
    } catch {}

    return { checks, networkInterfaces, dnsResolution: dnsOk };
  }

  @Get('logs')
  async recentLogs() {
    const logs: { type: string; entries: string[] }[] = [];

    try {
      const nginxError = childProcess.execSync('tail -30 /var/log/nginx/error.log 2>/dev/null || echo "No access"').toString().trim();
      logs.push({ type: 'Nginx Error Log', entries: nginxError.split('\n').filter(l => l.trim()) });
    } catch { logs.push({ type: 'Nginx Error Log', entries: ['Cannot read log'] }); }

    try {
      const nginxAccess = childProcess.execSync('tail -20 /var/log/nginx/access.log 2>/dev/null || echo "No access"').toString().trim();
      logs.push({ type: 'Nginx Access Log (last 20)', entries: nginxAccess.split('\n').filter(l => l.trim()) });
    } catch { logs.push({ type: 'Nginx Access Log', entries: ['Cannot read log'] }); }

    return logs;
  }

  @Get('table-stats')
  async tableStats() {
    const tables = [
      { key: 'machines', table: 'machines', label: 'Machines' },
      { key: 'downtime', table: 'downtime_records', label: 'Downtime Records' },
      { key: 'maintenance', table: 'maintenance_logs', label: 'Maintenance Logs' },
      { key: 'transfers', table: 'transfers', label: 'Transfers' },
      { key: 'spareParts', table: 'spare_part_requests', label: 'Spare Part Requests' },
      { key: 'rental', table: 'rental_requests', label: 'Rentals' },
      { key: 'users', table: 'users', label: 'Users' },
    ];

    const stats: { key: string; table: string; label: string; count: number }[] = [];
    for (const t of tables) {
      try {
        const result = await this.dataSource.query(`SELECT COUNT(*) as count FROM "${t.table}"`);
        stats.push({ ...t, count: parseInt(result[0].count, 10) });
      } catch {
        stats.push({ ...t, count: -1 });
      }
    }
    return stats;
  }

  @Delete('clear/:table')
  async clearTable(@Param('table') table: string, @Request() req: any) {
    const allowed: Record<string, { table: string; deps?: string[] }> = {
      downtime: { table: 'downtime_records' },
      maintenance: { table: 'maintenance_logs' },
      transfers: { table: 'transfers' },
      spareParts: { table: 'spare_part_requests' },
      rental: { table: 'rental_requests' },
    };

    const config = allowed[table];
    if (!config) {
      return { error: 'Table not allowed for clearing' };
    }

    const result = await this.dataSource.query(`DELETE FROM "${config.table}"`);
    const deleted = result[1] || 0;

    if (table === 'downtime') {
      await this.dataSource.query(
        `UPDATE machines SET status = 'active' WHERE status = 'under_repair'`,
      );
    }

    return { cleared: table, deleted, by: req.user.username };
  }
}
