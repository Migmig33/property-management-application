using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Data.Entity.ModelConfiguration;
using WebApplication1.Models.Tables;
namespace WebApplication1.Models.Maps
{
    public class tenant_document_maps : EntityTypeConfiguration<tenant_document>
     {
         public tenant_document_maps() {
             HasKey(x => x.id);
             ToTable("tenant_document");
        }
    
    }
}