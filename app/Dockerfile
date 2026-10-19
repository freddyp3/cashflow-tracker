FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /src

COPY gradlew settings.gradle.kts gradle.properties ./
COPY gradle/ gradle/
COPY app/build.gradle.kts app/
RUN ./gradlew :app:dependencies --no-daemon -q || true

COPY app/src app/src
RUN ./gradlew :app:bootJar --no-daemon --no-configuration-cache -x test \
    && find app/build/libs -name '*.jar' ! -name '*-plain*' -exec cp {} /src/app.jar \;

FROM eclipse-temurin:21-jre-alpine
RUN adduser -D -u 1000 app
USER app
COPY --from=build /src/app.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
