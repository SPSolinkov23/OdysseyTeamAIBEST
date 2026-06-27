using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolEvents.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserTheme : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "theme",
                table: "users",
                type: "varchar(5)",
                maxLength: 5,
                nullable: false,
                defaultValue: "light")
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "theme",
                table: "users");
        }
    }
}
