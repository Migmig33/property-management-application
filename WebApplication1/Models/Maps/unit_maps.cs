using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Data.Entity.ModelConfiguration;
using WebApplication1.Models.Tables;
namespace WebApplication1.Models.Maps
{
    public class unit_maps : EntityTypeConfiguration<unit>
    {
        public unit_maps() {
            HasKey(x => x.Uid);
            ToTable("unit");
        }
    }
}