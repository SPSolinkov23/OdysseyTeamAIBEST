FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
 
COPY src/SchoolEvents.Api/SchoolEvents.Api.csproj src/SchoolEvents.Api/
COPY src/SchoolEvents.Data/SchoolEvents.Data.csproj src/SchoolEvents.Data/
RUN dotnet restore src/SchoolEvents.Api/SchoolEvents.Api.csproj
 
COPY src/ src/
WORKDIR /src/src/SchoolEvents.Api
RUN dotnet publish -c Release -o /app
 
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app .
 
EXPOSE 8080
ENTRYPOINT ["dotnet", "SchoolEvents.Api.dll"]
