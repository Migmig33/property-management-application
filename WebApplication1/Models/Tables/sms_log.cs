using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace WebApplication1.Models.Tables
{
    public class sms_log
    {
        public int id { get; set; }
        public int Tid { get; set; }
        public string message { get; set; }
        public string type { get; set; }       // "LeaseExpiring" or "PaymentDue"
        public string status { get; set; }     // "Sent" or "Failed"
        public DateTime sentAt { get; set; }
    }
}