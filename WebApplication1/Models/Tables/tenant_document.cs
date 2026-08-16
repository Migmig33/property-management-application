using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace WebApplication1.Models.Tables
{
    public class tenant_document
    {
        public int id { get; set; }
        public int Tid { get; set; }    
        public string fileName { get; set; }
        public string fileType { get; set; }
        public string fileUrl { get; set; }
    }
}