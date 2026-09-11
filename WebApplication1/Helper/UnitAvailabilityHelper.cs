namespace WebApplication1.Helper
{
    public static class UnitAvailabilityHelper
    {
        public static bool HasOpenBedspace(int occupancyTypeId, int maxOccupants, int totalOccupants)
        {
            return occupancyTypeId == 3 && totalOccupants < maxOccupants;
        }
    }
}
