using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using WebApplication1.Models.Context;
using WebApplication1.Models.Tables;

namespace WebApplication1.Helper
{

    public static class AuditLogger
    {
        // Uses its OWN context so it never interferes with your action's context
        public static void Log(string type, string severity,
                               string message, string actor)
        {
            try
            {
                using (var db = new DB_Context())
                {
                    db.audit_log.Add(new audit_log
                    {
                        type = type,       // login | settings | security | user | backup
                        severity = severity,   // info | warning | critical
                        message = message,
                        actor = actor,
                        createdAt = DateTime.Now
                    });
                    db.SaveChanges();
                }
            }
            catch
            {
                // Never let logging break the real action — swallow or log to file
            }
        }
    }
}