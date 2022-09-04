import { Box, Input, Typography } from "@mui/material";
import { useField } from "formik";

export default function StyledInput({ label, name, ...props }) {
    const [field, meta, helpers] = useField(props);
    // console.log(meta.error[field.value[name]]);
    console.log(props);
    return (
      <Box display={'flex'} flexDirection={'column'}>
          <Input
            {...field}
            {...props}
            name={name}
            value={field.value[name]}
            placeholder={label}
          />
        
        <Typography color={"error"} marginBottom={"16px"} textAlign={"right"}>
          {meta.error[name]}
        </Typography>
      </Box>
    );
  }