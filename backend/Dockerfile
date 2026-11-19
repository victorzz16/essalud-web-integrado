
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY citas.jar app.jar

EXPOSE 10000

ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-10000} -jar /app/app.jar"]
