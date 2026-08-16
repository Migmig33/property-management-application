using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Data.Entity.ModelConfiguration;
using WebApplication1.Models.Tables;
namespace WebApplication1.Models.Maps
{
    public class co_occupant_maps : EntityTypeConfiguration<co_occupant>
    {
        public co_occupant_maps() {
            HasKey(x => x.id);
            ToTable("co_occupant");
        }
    
    }
}