using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace WebApplication1.Models
{
    public class LoginModelDTO
    {
        public string email { get; set; }
        public string password { get; set; }    
    }
    public class VisitorAuthDTO
    {
        public string name { get; set; }
        public string email { get; set; }
        public string phone { get; set; }
    }

    public class VisitorBookingDTO
    {
        public string date { get; set; }   // "yyyy-MM-dd"
        public string slot { get; set; }   // "08:00 AM"
        public string notes { get; set; }
    }
    public class IdFileDto
    {
        public int id { get; set; }
        public string name { get; set; }
        public string url { get; set; }
    }
}