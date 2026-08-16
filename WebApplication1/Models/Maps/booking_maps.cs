using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Data.Entity.ModelConfiguration;
using WebApplication1.Models.Tables;
namespace WebApplication1.Models.Maps
{
    public class booking_maps : EntityTypeConfiguration<booking>
    {
        public booking_maps() {
            HasKey(x => x.id);
            ToTable("booking");
        }
    }
}