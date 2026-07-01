using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using SchoolEvents.Api.Auth;
using SchoolEvents.Api.Controllers;
using SchoolEvents.Api.Dtos;
using SchoolEvents.Api.Infrastructure;
using SchoolEvents.Data;
using SchoolEvents.Data.Entities;
using Xunit;

namespace SchoolEvents.Tests;

public class AuthControllerTests
{
    private SchoolEventsDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SchoolEventsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new SchoolEventsDbContext(options);
    }

    private Mock<TokenService> GetMockTokenService()
    {
        var mock = new Mock<TokenService>();
        mock.Setup(t => t.Create(It.IsAny<User>()))
            .Returns(("fake_jwt_token", DateTime.UtcNow.AddHours(1)));
        return mock;
    }

    [Fact]
    public async Task Register_ShouldCreateStudentUser_WhenRoleIsStudentOrEmpty()
    {
        var db = GetInMemoryDbContext();
        var mockTokens = GetMockTokenService();
        var controller = new AuthController(db, mockTokens.Object);

        var req = new RegisterRequest
        {
            Email = "student@test.com",
            Password = "Password123",
            DisplayName = "Test Student",
            Role = "Student",
            Language = "bg",
            Theme = "dark"
        };

        var result = await controller.Register(req);

        var objectResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);

        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == "student@test.com");
        Assert.NotNull(user);
        Assert.Equal(UserRole.Student, user!.Role);
        Assert.Equal(OrganizerStatus.None, user.OrganizerStatus);
        
        var job = await db.NotificationJobs.SingleOrDefaultAsync();
        Assert.NotNull(job);
        Assert.Equal("AccountWelcome", job!.Type);

        var notification = await db.Notifications.SingleOrDefaultAsync();
        Assert.NotNull(notification);
    }

    [Fact]
    public async Task Register_ShouldSetPendingStatus_WhenRoleIsOrganizer()
    {
        var db = GetInMemoryDbContext();
        var mockTokens = GetMockTokenService();
        var controller = new AuthController(db, mockTokens.Object);

        var req = new RegisterRequest
        {
            Email = "organizer@test.com",
            Password = "Password123",
            DisplayName = "Test Organizer",
            Role = "Organizer"
        };

        await controller.Register(req);

        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == "organizer@test.com");
        Assert.NotNull(user);
        Assert.Equal(UserRole.Student, user!.Role); 
        Assert.Equal(OrganizerStatus.Pending, user.OrganizerStatus);

        var notifications = await db.Notifications.ToListAsync();
        Assert.Equal(2, notifications.Count); 
    }

    [Fact]
    public async Task Register_ShouldThrowConflict_WhenEmailAlreadyExists()
    {
        var db = GetInMemoryDbContext();
        db.Users.Add(new User { Email = "existing@test.com", DisplayName = "Existing" });
        await db.SaveChangesAsync();

        var mockTokens = GetMockTokenService();
        var controller = new AuthController(db, mockTokens.Object);

        var req = new RegisterRequest
        {
            Email = "Existing@test.com", 
            Password = "Password123",
            DisplayName = "New User"
        };

        await Assert.ThrowsAsync<ApiException>(() => controller.Register(req));
    }

    [Fact]
    public async Task Login_ShouldReturnToken_WhenCredentialsAreValid()
    {
        var db = GetInMemoryDbContext();
        var mockTokens = GetMockTokenService();
        var controller = new AuthController(db, mockTokens.Object);

        var passwordHash = PasswordHasher.Hash("MySecretPassword");
        db.Users.Add(new User 
        { 
            Email = "login@test.com", 
            PasswordHash = passwordHash, 
            DisplayName = "Login Test" 
        });
        await db.SaveChangesAsync();

        var req = new LoginRequest
        {
            Email = "login@test.com",
            Password = "MySecretPassword"
        };

        var result = await controller.Login(req);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<AuthResponse>(okResult.Value);
        Assert.Equal("fake_jwt_token", response.Token);
    }

    [Fact]
    public async Task Login_ShouldThrowUnauthorized_WhenPasswordIsIncorrect()
    {
        var db = GetInMemoryDbContext();
        var mockTokens = GetMockTokenService();
        var controller = new AuthController(db, mockTokens.Object);

        var passwordHash = PasswordHasher.Hash("MySecretPassword");
        db.Users.Add(new User 
        { 
            Email = "login@test.com", 
            PasswordHash = passwordHash, 
            DisplayName = "Login Test" 
        });
        await db.SaveChangesAsync();

        var req = new LoginRequest
        {
            Email = "login@test.com",
            Password = "WrongPassword"
        };

        await Assert.ThrowsAsync<ApiException>(() => controller.Login(req));
    }

    [Fact]
    public async Task Logout_ShouldReturnNoContent()
    {
        var db = GetInMemoryDbContext();
        var mockTokens = GetMockTokenService();
        var controller = new AuthController(db, mockTokens.Object);

        var result = controller.Logout();

        Assert.IsType<NoContentResult>(result);
    }
}