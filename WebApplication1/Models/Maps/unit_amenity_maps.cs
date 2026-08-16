using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Data.Entity.ModelConfiguration;
using WebApplication1.Models.Tables;
namespace WebApplication1.Models.Maps
{
    public class unit_amenity_maps : EntityTypeConfiguration<unit_amenity> { 

        public unit_amenity_maps() {
            HasKey(x => x.id);
            ToTable("unit_amenity");
        }
    }
}