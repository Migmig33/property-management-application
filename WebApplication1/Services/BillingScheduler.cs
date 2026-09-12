using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using WebApplication1.Helper;
using WebApplication1.Models.Context;
using WebApplication1.Models.Tables;

namespace WebApplication1.Services
{
    public static class BillingScheduler
    {
        public static DateTime? LastRunAt { get; private set; }
        public static string LastRunSummary { get; private set; }

        // Generates the current month's unpaid bill for each eligible tenant.
        // dryRun = true just counts what WOULD be created, without inserting.
        public static int Run(bool dryRun = false)
        {
            int created = 0;
            var today = DateTime.Now.Date;
            string period = today.ToString("MMMM yyyy");   // e.g. "September 2026"

            using (var db = new DB_Context())
            {
                // Eligible tenants: active, not terminated, lease still covers today
                var tenants = db.tenant
                    .Where(t => t.isTerminated == 0
                                && t.leaseStart <= today
                                && t.leaseEnd >= today
                                && t.unitId > 0)
                    .ToList();

                foreach (var t in tenants)
                {
                    // Skip if a bill for this month already exists (paid OR unpaid)
                    bool exists = db.payment.Any(p => p.Tid == t.Tid && p.billingPeriod == period);
                    if (exists) continue;

                    // Amount = the unit's current price
                    var unit = db.unit.FirstOrDefault(u => u.Uid == t.unitId);
                    if (unit == null) continue;

                    created++;

                    if (!dryRun)
                    {
                        db.payment.Add(new payment
                        {
                            Tid = t.Tid,
                            Uid = t.unitId,
                            amount = unit.price,
                            dueDate = new DateTime(today.Year, today.Month, 5), // due on the 5th
                            paidDate = null,                                    // unpaid
                            billingPeriod = period
                        });
                    }
                }

                if (!dryRun && created > 0)
                    db.SaveChanges();
            }

            LastRunAt = DateTime.Now;
            LastRunSummary = (dryRun ? "[dry run] " : "") + created + " bill(s) for " + period;

            if (!dryRun && created > 0)
                AuditLogger.Log("settings", "info",
                    "Generated " + created + " monthly bill(s) for " + period, "System");

            return created;
        }
    }
}