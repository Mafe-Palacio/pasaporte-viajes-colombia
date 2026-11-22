using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColombiaTravel.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddClimateToTrips : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClimateFeeling",
                table: "TripEntries",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClimateNotes",
                table: "TripEntries",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClimateFeeling",
                table: "TripEntries");

            migrationBuilder.DropColumn(
                name: "ClimateNotes",
                table: "TripEntries");
        }
    }
}
