using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace WebApplication1.Models.Tables
{
    public class co_occupant
    {
        public int id { get; set; }
        public int Tid { get; set; }
        public string name { get; set; }
        public string phone { get; set; }
        public string address { get; set; }
    }
}