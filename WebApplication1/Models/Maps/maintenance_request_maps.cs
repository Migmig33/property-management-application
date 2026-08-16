using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Data.Entity.ModelConfiguration;
using WebApplication1.Models.Tables;
namespace WebApplication1.Models.Maps
{
    public class maintenance_request_maps : EntityTypeConfiguration<maintenance_request>
    {
        public maintenance_request_maps() {
            HasKey(x => x.id);
            ToTable("maintenance_request");
        }
    

    }
}