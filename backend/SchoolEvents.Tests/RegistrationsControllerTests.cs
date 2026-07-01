using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using SchoolEvents.Api.Controllers;
using SchoolEvents.Api.Dtos;
using SchoolEvents.Api.Services;
using SchoolEvents.Data;
using SchoolEvents.Data.Entities;
using Xunit;

namespace SchoolEvents.Tests;

public class RegistrationsControllerTests
{
    private SchoolEventsDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<SchoolEventsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new SchoolEventsDbContext(options);
    }

    private RegistrationsController CreateController(Mock<RegistrationService> mockService, SchoolEventsDbContext db, long loggedInUserId)
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new Claim(ClaimTypes.NameIdentifier, loggedInUserId.ToString()),
            new Claim(ClaimTypes.Role, "Student")
        }, "mockAuth"));

        var controller = new RegistrationsController(mockService.Object, db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            }
        };

        return controller;
    }

    [Fact]
    public async Task Register_ShouldReturnCreatedWithRegistrationDto()
    {
        var db = GetInMemoryDbContext();
        var mockService = new Mock<RegistrationService>();
        mockService.Setup(s => s.RegisterAsync(It.IsAny<long>(), It.IsAny<long>()))
                   .ReturnsAsync(new RegistrationDto());

        var controller = CreateController(mockService, db, 1);

        var result = await controller.Register(10);

        var objectResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);
        Assert.IsType<RegistrationDto>(objectResult.Value);
    }

    [Fact]
    public async Task Mine_ShouldReturnUserRegistrationsAndCalculateWaitlist()
    {
        var db = GetInMemoryDbContext();
        
        var testEvent = new Event 
        { 
            Id = 10, 
            Title = "Test Event", 
            Category = "Science", 
            Location = "Lab" 
        };
        db.Events.Add(testEvent);

        db.Registrations.Add(new Registration 
        { 
            Id = 1, 
            UserId = 1, 
            EventId = 10, 
            Status = RegistrationStatus.Confirmed, 
            CreatedAt = DateTime.UtcNow.AddMinutes(-10), 
            Event = testEvent 
        });
        
        db.Registrations.Add(new Registration 
        { 
            Id = 2, 
            UserId = 1, 
            EventId = 10, 
            Status = RegistrationStatus.Waitlisted, 
            CreatedAt = DateTime.UtcNow.AddMinutes(-5), 
            Event = testEvent 
        });
        
        db.Registrations.Add(new Registration 
        { 
            Id = 3, 
            UserId = 2, 
            EventId = 10, 
            Status = RegistrationStatus.Waitlisted, 
            CreatedAt = DateTime.UtcNow.AddMinutes(-8), 
            Event = testEvent 
        });
        
        db.Registrations.Add(new Registration 
        { 
            Id = 4, 
            UserId = 1, 
            EventId = 10, 
            Status = RegistrationStatus.Cancelled, 
            CreatedAt = DateTime.UtcNow, 
            Event = testEvent 
        });

        await db.SaveChangesAsync();

        var mockService = new Mock<RegistrationService>();
        var controller = CreateController(mockService, db, 1);

        var result = await controller.Mine();

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<RegistrationListResponse>(okResult.Value);

        Assert.Equal(2, response.Registrations.Count);

        var waitlisted = response.Registrations.Single(r => r.Status == RegistrationStatus.Waitlisted);
        Assert.Equal(2, waitlisted.WaitlistPosition);
    }

    [Fact]
    public async Task Cancel_ShouldReturnOkWithCancelResult()
    {
        var db = GetInMemoryDbContext();
        var mockService = new Mock<RegistrationService>();
        mockService.Setup(s => s.CancelAsync(It.IsAny<long>(), It.IsAny<long>()))
                   .ReturnsAsync(new CancelResult());

        var controller = CreateController(mockService, db, 1);

        var result = await controller.Cancel(10);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<CancelResult>(okResult.Value);
    }
}