// web/server/db/repositories/BaseRepository.ts

import { dbQuery, dbExecute } from '../index.js';
import { ResultSetHeader } from 'mysql2';

export interface IBaseRepository<T> {
  findById(id: number | string): Promise<T | null>;
  findAll(options?: any): Promise<T[]>;
  delete(id: number | string): Promise<boolean>;
}

export abstract class BaseRepository<T> implements IBaseRepository<T> {
  protected tableName: string;
  protected idField: string = 'id';

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async findById(id: number | string): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE ${this.idField} = ?`;
    const rows = await dbQuery(query, [id]);
    return rows.length > 0 ? rows[0] as T : null;
  }

  async findAll(options?: { 
    limit?: number; 
    offset?: number; 
    orderBy?: string; 
    orderDirection?: 'ASC' | 'DESC';
    where?: Record<string, any>;
  }): Promise<T[]> {
    let query = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];

    // WHERE clause
    if (options?.where) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(options.where)) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    // ORDER BY
    if (options?.orderBy) {
      query += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'DESC'}`;
    }

    // LIMIT & OFFSET
    if (options?.limit) {
      query += ` LIMIT ?`;
      params.push(options.limit);
      if (options?.offset) {
        query += ` OFFSET ?`;
        params.push(options.offset);
      }
    }

    const rows = await dbQuery(query, params);
    return rows as T[];
  }

  async delete(id: number | string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE ${this.idField} = ?`;
    const result = await dbExecute(query, [id]) as ResultSetHeader;
    return result.affectedRows > 0;
  }

  async count(where?: Record<string, any>): Promise<number> {
    let query = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    const params: any[] = [];

    if (where) {
      const conditions: string[] = [];
      for (const [key, value] of Object.entries(where)) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    const rows = await dbQuery(query, params);
    return rows.length > 0 ? rows[0].total : 0;
  }

  async exists(id: number | string): Promise<boolean> {
    const count = await this.count({ [this.idField]: id });
    return count > 0;
  }
}

/*

findById(id)	پیدا کردن با ID	Promise<T | null>
findAll(options?)	دریافت همه رکوردها با options	Promise<T[]>
delete(id)	حذف رکورد	Promise<boolean>
count(where?)	تعداد رکوردها	Promise<number>
exists(id)	بررسی وجود رکورد	Promise<boolean>

*/