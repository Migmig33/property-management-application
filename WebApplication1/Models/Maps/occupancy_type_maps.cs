using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Data.Entity.ModelConfiguration;
using WebApplication1.Models.Tables;    
namespace WebApplication1.Models.Maps
{
    public class occupancy_type_maps : EntityTypeConfiguration<occupancy_type>
    {
        public occupancy_type_maps() {
            HasKey(x => x.occupancyTypeId);
            ToTable("occupancy_type");
        }
    
    }
}