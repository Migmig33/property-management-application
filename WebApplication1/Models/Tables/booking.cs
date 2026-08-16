using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace WebApplication1.Models.Tables
{
    public class booking
    {
        public int id { get; set; }
        public int Uid { get; set; }
        public string guestName { get; set; }
        public string guestEmail { get; set; }
        public string guestPhone { get; set; }
        public DateTime bookingDatetime { get; set; }
        public string status { get; set; }
        public string notes { get; set; }
        public string cancelReason { get; set; }
    }
}