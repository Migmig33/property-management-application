using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Data.Entity.ModelConfiguration;
using WebApplication1.Models.Tables;
namespace WebApplication1.Models.Maps
{
    public class busy_schedule_maps : EntityTypeConfiguration<busy_schedule>
    {
        public busy_schedule_maps() { 
            HasKey(x => x.id);
            ToTable("busy_schedule");
        }
    }
}