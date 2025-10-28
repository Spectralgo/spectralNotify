import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Container } from "@/components/container";
import { LiveCounter } from "@/components/live-counter";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export default function Home() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());
  const { data: session } = authClient.useSession();

  // Fetch all counters
  const counters = useQuery(orpc.counter.listAll.queryOptions());

  // Selected counter state
  const [selectedCounter, setSelectedCounter] = useState<string | null>(null);

  return (
    <Container>
      <ScrollView className="flex-1">
        <View className="px-4">
          <Text className="mb-4 font-bold font-mono text-3xl text-foreground">
            SPECTRAL NOTIFY
          </Text>

          {/* User Session Card */}
          {session?.user ? (
            <View className="mb-6 rounded-lg border border-border bg-card p-4">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-base text-foreground">
                  Welcome,{" "}
                  <Text className="font-medium">{session.user.name}</Text>
                </Text>
              </View>
              <Text className="mb-4 text-muted-foreground text-sm">
                {session.user.email}
              </Text>

              <TouchableOpacity
                className="self-start rounded-md bg-destructive px-4 py-2"
                onPress={() => {
                  authClient.signOut();
                  queryClient.invalidateQueries();
                }}
              >
                <Text className="font-medium text-white">Sign Out</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* API Status */}
          <View className="mb-6 rounded-lg border border-border p-4">
            <Text className="mb-3 font-medium text-foreground">API Status</Text>
            <View className="flex-row items-center gap-2">
              <View
                className={`h-3 w-3 rounded-full ${
                  healthCheck.data ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <Text className="text-muted-foreground">
                {healthCheck.isLoading
                  ? "Checking..."
                  : healthCheck.data
                    ? "Connected to API"
                    : "API Disconnected"}
              </Text>
            </View>
          </View>

          {/* Counter List and Live Display */}
          {session?.user ? (
            <>
              <View className="mb-6 rounded-lg border border-border p-4">
                <Text className="mb-3 font-medium text-foreground">
                  Live Counters
                </Text>

                {counters.isLoading ? (
                  <View className="items-center py-4">
                    <ActivityIndicator color="#3b82f6" size="small" />
                    <Text className="mt-2 text-muted-foreground text-sm">
                      Loading counters...
                    </Text>
                  </View>
                ) : counters.data?.counters.length === 0 ? (
                  <View className="items-center py-8">
                    <Text className="text-center text-muted-foreground">
                      No counters found.{"\n"}Create one from the web app!
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={counters.data?.counters}
                    keyExtractor={(item) => item.name}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        className={`mb-2 rounded-md border p-3 ${
                          selectedCounter === item.name
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background"
                        }`}
                        onPress={() => setSelectedCounter(item.name)}
                      >
                        <View className="flex-row items-center justify-between">
                          <Text
                            className={`font-medium ${
                              selectedCounter === item.name
                                ? "text-primary"
                                : "text-foreground"
                            }`}
                          >
                            {item.name}
                          </Text>
                          {selectedCounter === item.name && (
                            <View className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </View>
                        <Text className="mt-1 text-muted-foreground text-xs">
                          Created{" "}
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                      </TouchableOpacity>
                    )}
                    scrollEnabled={false}
                  />
                )}
              </View>

              {/* Live Counter Display */}
              {selectedCounter && (
                <View className="mb-6">
                  <LiveCounter
                    counterName={selectedCounter}
                    showMetadata={true}
                  />
                </View>
              )}
            </>
          ) : (
            <>
              <View className="mb-6 rounded-lg border border-border bg-muted p-4">
                <Text className="text-center text-muted-foreground">
                  Sign in to view and monitor live counters
                </Text>
              </View>
              <SignIn />
              <SignUp />
            </>
          )}
        </View>
      </ScrollView>
    </Container>
  );
}
