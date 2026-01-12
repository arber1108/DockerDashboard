import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
export default function Home() {
  return (
    <div>
      <h1 className="flex justify-center pt-5 text-6xl">Docker Dashboard</h1>
      <div className="flex flex-row gap-3 pt-5 m-5">
        <div className="w-xl">
          <Card>
            <CardHeader>
              <CardTitle>Container Titel</CardTitle>
              <CardDescription>Image</CardDescription>
              <CardAction>Manage Container</CardAction>
            </CardHeader>
            <CardContent>
              <p>Status</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
