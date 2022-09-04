import { Badge } from "@mui/material";
import { styled } from "@mui/system";

export const StyledInput = styled('input')({
    width:'100%',
    padding:10,
    height:33,
    borderRadius:10,
    border:'none',
    boxShadow:'0px 1px 5px 0px rgb(0 0 0 / 75%)',
    outline:'none'
})

export const StyledBadge = styled(Badge)({
    '& .MuiBadge-badge': {
      backgroundColor: '#44b700',
      color: '#44b700',
      '&::after': {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        animation: 'ripple 1.2s infinite ease-in-out',
        border: '1px solid currentColor',
        content: '""',
      },
    },
    '@keyframes ripple': {
      '0%': {
        transform: 'scale(.8)',
        opacity: 1,
      },
      '100%': {
        transform: 'scale(2.4)',
        opacity: 0,
      },
    },
  });