import express, { Request, Response } from "express";
import sql from 'mssql';
import { userRepository } from '../db/repositories/UserRepository.js';

const router = express.Router();

// پیکربندی اتصال به دیتابیس SQL Server
const sqlServerConfig = {
    server: '192.168.200.6',
    database: 'Azaran',
    user: 'sa',
    password: 'DBBehko2019',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

router.get("/updateusers", async (req: Request, res: Response) => {
    let sqlConn = null;
    const results: any[] = [];
    let successCount = 0;
    let errorCount = 0;
    let updatedUsers: number[] = [];

    try {
        console.log('🔄 شروع فرآیند به‌روزرسانی کاربران...');
        
        // 1. اتصال به دیتابیس SQL Server
        sqlConn = await sql.connect(sqlServerConfig);
        console.log('✅ اتصال موفق به دیتابیس SQL Server برقرار شد.');

        // 2. اجرای کوئری دریافت کاربران
        const query = `
        WITH BaseQuery AS (
            SELECT 
                H.ID AS PersonnelId,
                H.PersonnelName,
                H.Family,
                H.NationalCode,
                H.code,
                MAX(A.Mobile) AS Mobile
            FROM HrmPersonnel AS H
            LEFT JOIN HrmPersonnelAddress AS A
                ON A.PersonnelId = H.ID
            INNER JOIN HrmPersonnelVerdict AS V
                ON V.PersonnelId = H.ID
            INNER JOIN HrmJobs_HrmOrganizationBrigade AS J
                ON J.ID = V.JobsOrgBrigadeId
            INNER JOIN HrmOrganizationBrigade AS OB
                ON OB.ID = J.OrganizationBrigadeId
            WHERE 
                H.IsActive = 1
                AND OB.OrgBrigadeName NOT LIKE N'%واحد ترابری و آمد و شد%'
            GROUP BY 
                H.ID,  
                H.PersonnelName,
                H.Family,
                H.NationalCode,
                H.code
        )
        SELECT 
            BQ.PersonnelName,
            BQ.Family,
            BQ.NationalCode,
            BQ.code,
            BQ.Mobile
        FROM BaseQuery AS BQ;
        `;

        const result = await sqlConn.query(query);
        const records = result.recordset;

        console.log(`📊 ${records.length} رکورد از دیتابیس SQL Server دریافت شد.`);

        // 3. پردازش هر رکورد و ذخیره در MySQL
        for (const row of records) {
            try {
                const { PersonnelName, Family, NationalCode, code, Mobile } = row;

                // بررسی وجود تمام فیلدهای ضروری
                if (PersonnelName && Family && Mobile && NationalCode && code) {
                    
                    // ترکیب first_name و last_name برای display_name
                    const displayName = `${PersonnelName} ${Family}`.trim();

                    // بررسی وجود کاربر در دیتابیس MySQL
                    const existingUser = await userRepository.findByNationalCode(NationalCode);

                    if (!existingUser) {
                        // ایجاد کاربر جدید
                        const newUser = await userRepository.create({
                            phone: Mobile,
                            nationalCode: NationalCode,
                            personCode: code,
                            first_name: PersonnelName,
                            last_name: Family,
                            display_name: displayName,
                            avatar_url: null,
                            status: 'offline',
                            role: 'user',
                            is_banned: 0,
                            is_muted: 0
                        });
                        
                        updatedUsers.push(newUser.id!);
                        successCount++;
                        console.log(`✅ کاربر جدید ایجاد شد: ${displayName} (${NationalCode})`);
                        
                    } else {
                        // به‌روزرسانی کاربر موجود
                        const updatedUser = await userRepository.update(existingUser.id!, {
                            phone: Mobile,
                            personCode: code,
                            first_name: PersonnelName,
                            last_name: Family,
                            display_name: displayName,
                            // اگر کاربر غیرفعال بوده، فعالش کن
                            status: existingUser.status || 'offline'
                        });
                        
                        // اگر کاربر غیرفعال بوده، فعالش کن
                        if (existingUser.is_banned === 1) {
                            await userRepository.unbanUser(existingUser.id!);
                        }
                        
                        updatedUsers.push(existingUser.id!);
                        successCount++;
                        console.log(`🔄 کاربر به‌روزرسانی شد: ${displayName} (${NationalCode})`);
                    }
                }
            } catch (error) {
                errorCount++;
                console.error('❌ خطا در پردازش کاربر:', row, error);
                continue;
            }
        }

        // 4. غیرفعال کردن کاربرانی که در لیست نیستند
        // دریافت همه کاربران فعال
        const allUsers = await userRepository.findAll();
        const activeUserIds = allUsers.map(u => u.id!).filter(id => id !== undefined);
        
        // کاربرانی که باید غیرفعال شوند (در لیست به‌روز شده نیستند)
        const usersToDeactivate = activeUserIds.filter(id => !updatedUsers.includes(id));
        
        if (usersToDeactivate.length > 0) {
            for (const userId of usersToDeactivate) {
                // به جای حذف، کاربر را بن می‌کنیم (غیرفعال)
                await userRepository.banUser(userId);
                console.log(`🚫 کاربر با ID ${userId} غیرفعال شد`);
            }
        }

        // 5. بستن اتصال SQL Server
        if (sqlConn) {
            await sqlConn.close();
        }

        // 6. ارسال پاسخ موفق
        console.log(`✅ فرآیند به‌روزرسانی با موفقیت انجام شد.`);
        console.log(`📊 آمار: ${successCount} موفق، ${errorCount} ناموفق`);

        res.status(200).json({
            success: true,
            message: 'کاربران با موفقیت به‌روزرسانی شدند',
            data: {
                totalRecords: records.length,
                successCount,
                errorCount,
                updatedUsers: updatedUsers.length,
                deactivatedUsers: usersToDeactivate.length
            }
        });

    } catch (error: any) {
        console.error('❌ خطا در فرآیند به‌روزرسانی:', error);
        
        // بستن اتصال در صورت وجود خطا
        try {
            if (sqlConn) await sqlConn.close();
        } catch (closeError) {
            console.error('خطا در بستن اتصال:', closeError);
        }

        res.status(500).json({
            success: false,
            message: 'خطا در فرآیند به‌روزرسانی کاربران',
            error: error.message
        });
    }
});

export default router;