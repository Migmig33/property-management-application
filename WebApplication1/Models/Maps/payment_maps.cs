using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Data.Entity.ModelConfiguration;
using WebApplication1.Models.Tables;
namespace WebApplication1.Models.Maps
{
    public class payment_maps : EntityTypeConfiguration<payment>
    {
        public payment_maps() {
            HasKey(x => x.id);
            ToTable("payment");
        }   
    }
}