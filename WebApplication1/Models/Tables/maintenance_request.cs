using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace WebApplication1.Models.Tables
{
    public class maintenance_request
    {
        public int id { get; set; }
        public int Tid { get; set; }
        public int Uid { get; set; }
        public string category { get; set; }
        public string description { get; set; }
        public string status { get; set; }
        public string priority { get; set; }
        public DateTime reportedDate { get; set; }
        public DateTime? resolvedDate { get; set; }
    }
}