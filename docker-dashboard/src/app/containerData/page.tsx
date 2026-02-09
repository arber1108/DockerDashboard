import { columns } from "./columns";
import { DataTable } from "./data-table";
import { getContainerData } from "../actions/db";

export default async function DemoPage() {
  const data = await getContainerData();

  return (
    <div className="container mx-auto py-10">
      <DataTable columns={columns} data={data} />
    </div>
  );
}
