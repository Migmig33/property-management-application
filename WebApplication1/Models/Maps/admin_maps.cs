using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Data.Entity.ModelConfiguration;
using WebApplication1.Models.Tables;
namespace WebApplication1.Models.Maps
{
    public class admin_maps : EntityTypeConfiguration<admin>
    {
        public admin_maps()
        {
            this.HasKey(a => a.id);
            this.ToTable("admin");

        }
    }
}