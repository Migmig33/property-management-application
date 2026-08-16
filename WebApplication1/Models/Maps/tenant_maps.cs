using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Data.Entity.ModelConfiguration;
using WebApplication1.Models.Tables;
namespace WebApplication1.Models.Maps
{
    public class tenant_maps : EntityTypeConfiguration<tenant>
     {
         public tenant_maps() {
             HasKey(x => x.Tid);
             ToTable("tenant");
        }
    
    }
}