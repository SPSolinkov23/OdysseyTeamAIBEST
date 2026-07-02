using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using SchoolEvents.Api.Controllers;
using SchoolEvents.Api.Dtos;
using SchoolEvents.Api.Services;
using Xunit;

namespace SchoolEvents.Tests;

public class EventsControllerTests
{
    private EventsController CreateController(Mock<EventService> mockService, long? userId = null, bool isOrganizer = false)
    {
        var controller = new EventsController(mockService.Object);

        if (userId.HasValue)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId.Value.ToString())
            };
            
            if (isOrganizer)
            {
                claims.Add(new Claim(ClaimTypes.Role, "Organizer"));
            }

            var identity = new ClaimsIdentity(claims, "mockAuth");
            var user = new ClaimsPrincipal(identity);

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
        }
        else
        {
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) }
            };
        }

        return controller;
    }

    [Fact]
    public async Task List_ShouldReturnOkWithEventList()
    {
        var mockService = new Mock<EventService>();
        mockService.Setup(s => s.ListAsync(It.IsAny<long?>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<bool>(), It.IsAny<int>(), It.IsAny<int>()))
                   .ReturnsAsync(new EventListResponse());

        var controller = CreateController(mockService);

        var result = await controller.List(null, null, null, false, 1, 9);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<EventListResponse>(okResult.Value);
    }

    [Fact]
    public async Task Get_ShouldReturnOkWithEventEnvelope()
    {
        var mockService = new Mock<EventService>();
        mockService.Setup(s => s.GetAsync(It.IsAny<long>(), It.IsAny<long?>(), It.IsAny<bool>()))
                   .ReturnsAsync(new EventDto());

        var controller = CreateController(mockService, 1, true);

        var result = await controller.Get(10);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var envelope = Assert.IsType<EventEnvelope>(okResult.Value);
        Assert.NotNull(envelope.Event);
    }

    [Fact]
    public async Task Create_ShouldReturnCreatedWithEventEnvelope()
    {
        var mockService = new Mock<EventService>();
        mockService.Setup(s => s.CreateAsync(It.IsAny<long>(), It.IsAny<CreateEventRequest>()))
                   .ReturnsAsync(new EventDto());

        var controller = CreateController(mockService, 1, true);
        var req = new CreateEventRequest();

        var result = await controller.Create(req);

        var objectResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);
        var envelope = Assert.IsType<EventEnvelope>(objectResult.Value);
        Assert.NotNull(envelope.Event);
    }

    [Fact]
    public async Task Update_ShouldReturnOkWithEventEnvelope()
    {
        var mockService = new Mock<EventService>();
        mockService.Setup(s => s.UpdateAsync(It.IsAny<long>(), It.IsAny<long>(), It.IsAny<UpdateEventRequest>()))
                   .ReturnsAsync(new EventDto());

        var controller = CreateController(mockService, 1, true);
        var req = new UpdateEventRequest();

        var result = await controller.Update(10, req);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var envelope = Assert.IsType<EventEnvelope>(okResult.Value);
        Assert.NotNull(envelope.Event);
    }

    [Fact]
    public async Task Publish_ShouldReturnOkWithEventEnvelope()
    {
        var mockService = new Mock<EventService>();
        mockService.Setup(s => s.PublishAsync(It.IsAny<long>(), It.IsAny<long>()))
                   .ReturnsAsync(new EventDto());

        var controller = CreateController(mockService, 1, true);

        var result = await controller.Publish(10);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var envelope = Assert.IsType<EventEnvelope>(okResult.Value);
        Assert.NotNull(envelope.Event);
    }

    [Fact]
    public async Task Cancel_ShouldReturnOkWithEventEnvelope()
    {
        var mockService = new Mock<EventService>();
        mockService.Setup(s => s.CancelAsync(It.IsAny<long>(), It.IsAny<long>()))
                   .ReturnsAsync(new EventDto());

        var controller = CreateController(mockService, 1, true);

        var result = await controller.Cancel(10);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var envelope = Assert.IsType<EventEnvelope>(okResult.Value);
        Assert.NotNull(envelope.Event);
    }

    [Fact]
    public async Task Attendees_ShouldReturnOkWithRegistrationsResponse()
    {
        var mockService = new Mock<EventService>();
        mockService.Setup(s => s.GetAttendeesAsync(It.IsAny<long>(), It.IsAny<long>()))
                   .ReturnsAsync(new EventRegistrationsResponse());

        var controller = CreateController(mockService, 1, true);

        var result = await controller.Attendees(10);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<EventRegistrationsResponse>(okResult.Value);
    }

    [Fact]
    public async Task Waitlist_ShouldReturnOkWithWaitlistResponse()
    {
        var mockService = new Mock<EventService>();
        mockService.Setup(s => s.GetWaitlistAsync(It.IsAny<long>(), It.IsAny<long>()))
                   .ReturnsAsync(new WaitlistResponse());

        var controller = CreateController(mockService, 1, true);

        var result = await controller.Waitlist(10);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<WaitlistResponse>(okResult.Value);
    }
}