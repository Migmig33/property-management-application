using System;
using System.Collections.Generic;
using System.Data.Entity.ModelConfiguration;
using System.Linq;
using System.Web;
using WebApplication1.Models.Tables;

namespace WebApplication1.Models.Maps
{
    public class audit_log_maps : EntityTypeConfiguration<audit_log>
    {
        public audit_log_maps()
        {
            HasKey(x => x.logId);
            ToTable("audit_log");
        }
    }
}