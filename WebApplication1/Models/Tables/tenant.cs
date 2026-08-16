using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace WebApplication1.Models.Tables
{
    public class tenant
    {
        public int Tid { get; set; }
        public string tenantNumber { get; set; }
        public int unitId { get; set; }
        public string name { get; set; }
        public string email { get; set; }
        public string phone { get; set; }
        public System.DateTime leaseStart { get; set; }
        public System.DateTime leaseEnd { get; set; }
        public string status { get; set; }
        public string address { get; set; }
        public string occupation { get; set; }
        public string passwordHash { get; set; }
        public int occupancyTypeId{ get; set; }
        public int isTerminated { get; set; }
        public List<int> deletedCoOccupants { get; set; }

    }
}